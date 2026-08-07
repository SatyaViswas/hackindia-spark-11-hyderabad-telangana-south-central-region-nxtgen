async function run() {
  const res = await fetch("http://127.0.0.1:8000/api/v1/agents/8b555ad7-ee4e-40fa-8c31-28fd9afe5d50/schedule", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": "00000000-0000-0000-0000-000000000000"
    },
    body: JSON.stringify({
      trigger_type: "scheduled",
      cron_schedule: null,
      status: "paused"
    })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

run();
