import fs from 'fs';
import path from 'path';

async function run() {
  const userId = "00000000-0000-0000-0000-000000000000";
  const getRes = await fetch(`http://127.0.0.1:8000/api/v1/agents?user_id=${userId}`);
  const getJson = await getRes.json();
  const agents = getJson.agents || [];
  
  const activeAgent = agents.find(a => a.status === "active" && (a.trigger_type === "scheduled" || a.trigger_type === "event_trigger"));
  
  if (!activeAgent) {
    console.log("No active scheduled/event agent found.");
    return;
  }
  
  console.log("Found agent:", activeAgent.id, activeAgent.trigger_type);
  
  const patchRes = await fetch(`http://127.0.0.1:8000/api/v1/agents/${activeAgent.id}/schedule`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId
    },
    body: JSON.stringify({
      trigger_type: activeAgent.trigger_type,
      cron_schedule: activeAgent.cron_schedule ?? null,
      status: "paused"
    })
  });
  
  const text = await patchRes.text();
  console.log("PATCH Status:", patchRes.status);
  console.log("PATCH Response:", text);
}

run();
