require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HA_BASE_URL = process.env.HA_BASE_URL;
const HA_TOKEN = process.env.HA_TOKEN;

// Entity-id för nattläget i Home Assistant, t.ex. input_boolean.nattlage
const NIGHT_MODE_ENTITY = process.env.NIGHT_MODE_ENTITY || 'input_boolean.nattlage';

// Kommaseparerad lista med EN entitet per nyckelknippa/familjemedlem.
// Lägg t.ex. i .env:
//   KEY_ENTITIES=input_boolean.nyckel_anna,input_boolean.nyckel_erik,person.barn
// Funkar med både input_boolean (on/off) och person-entiteter (home/away/...).
const KEY_ENTITIES = (process.env.KEY_ENTITIES || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

if (!HA_BASE_URL || !HA_TOKEN) {
    console.warn('Varning: HA_BASE_URL eller HA_TOKEN saknas i .env');
}
if (KEY_ENTITIES.length === 0) {
    console.warn('Varning: KEY_ENTITIES är inte satt i .env – "Närvaro" kommer visa 0 nycklar.');
}

// Liten hjälpfunktion mot Home Assistant. Använder inbyggd fetch (Node 18+),
// så vi slipper axios helt och behöver inte importera något extra för det.
async function haGet(path) {
    const response = await fetch(`${HA_BASE_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${HA_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`Home Assistant svarade med status ${response.status} för ${path}`);
    }
    return response.json();
}

async function haPost(path, body) {
    const response = await fetch(`${HA_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${HA_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`Home Assistant svarade med status ${response.status} för ${path}`);
    }
    return response.json().catch(() => ({}));
}

// ---------------------------------------------------------------------------
// LARM
// ---------------------------------------------------------------------------

app.get('/api/alarm-status', async (req, res) => {
    try {
        const data = await haGet('/api/states/input_boolean.larm_status');
        res.json({
            entity_id: data.entity_id,
            state: data.state, // "on" = armerat, "off" = avaktiverat
            last_changed: data.last_changed,
        });
    } catch (error) {
        console.error('Fel vid hämtning av larmstatus:', error.message);
        res.status(500).json({ error: 'Kunde inte hämta larmstatus' });
    }
});

app.post('/api/alarm-toggle', async (req, res) => {
    const { state } = req.body; // "on" eller "off" från frontend
    const service = state === 'on' ? 'turn_on' : 'turn_off';

    try {
        await haPost(`/api/services/input_boolean/${service}`, {
            entity_id: 'input_boolean.larm_status',
        });
        res.json({ success: true, message: `Larm sattes till: ${state}` });
    } catch (error) {
        console.error('Fel vid ändring av larmstatus:', error.message);
        res.status(500).json({ error: 'Kunde inte ändra larmstatus' });
    }
});

// ---------------------------------------------------------------------------
// NYCKLAR / NÄRVARO
// Returnerar både en samlad on/off-status (för bakåtkompatibilitet) och
// home_count/total/entities så frontend kan visa "2 av 3 hemma" + namn.
// ---------------------------------------------------------------------------

app.get('/api/keys-status', async (req, res) => {
    if (KEY_ENTITIES.length === 0) {
        return res.json({ state: 'off', count: 0, total: 0, entities: [] });
    }

    try {
        const results = await Promise.all(KEY_ENTITIES.map((id) => haGet(`/api/states/${id}`)));

        // Räknas som "hemma" oavsett om entiteten är en input_boolean (on/off)
        // eller en person-entitet (home/away).
        const entities = results.map((data) => {
            const home = data.state === 'on' || data.state === 'home';
            return {
                entity_id: data.entity_id,
                state: data.state,
                name: data.attributes?.friendly_name || data.entity_id,
                home,
            };
        });

        const count = entities.filter((e) => e.home).length;

        res.json({
            state: count > 0 ? 'on' : 'off',
            count,
            total: entities.length,
            entities,
        });
    } catch (error) {
        console.error('Fel vid hämtning av nyckelstatus:', error.message);
        res.status(500).json({ error: 'Kunde inte hämta nyckelstatus' });
    }
});

// ---------------------------------------------------------------------------
// NATTLÄGE
// ---------------------------------------------------------------------------

app.get('/api/night-mode', async (req, res) => {
    try {
        const data = await haGet(`/api/states/${NIGHT_MODE_ENTITY}`);
        res.json({
            entity_id: data.entity_id,
            state: data.state,
            last_changed: data.last_changed,
        });
    } catch (error) {
        console.error('Fel vid hämtning av nattläge:', error.message);
        res.status(500).json({ error: 'Kunde inte hämta nattläge' });
    }
});

app.post('/api/night-mode-toggle', async (req, res) => {
    const { state } = req.body;
    const service = state === 'on' ? 'turn_on' : 'turn_off';

    try {
        await haPost(`/api/services/input_boolean/${service}`, {
            entity_id: NIGHT_MODE_ENTITY,
        });
        res.json({ success: true, message: `Nattläge sattes till: ${state}` });
    } catch (error) {
        console.error('Fel vid ändring av nattläge:', error.message);
        res.status(500).json({ error: 'Kunde inte ändra nattläge' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server rullar på http://localhost:${PORT}`);
    console.log(`Testa: http://localhost:${PORT}/api/alarm-status`);
});