function formatUptime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

async function refresh() {
  const dot = document.getElementById("dot");
  try {
    const res = await fetch("/status.json");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();

    document.getElementById("version").textContent = data.version;
    document.getElementById("uptime").textContent = formatUptime(data.uptimeSeconds);
    document.getElementById("last-checked").textContent = new Date(
      data.lastCheckedAt,
    ).toLocaleTimeString();
    dot.classList.remove("down");
    if (data.state === "degraded") {
      dot.classList.add("degraded");
    } else {
      dot.classList.remove("degraded");
    }
  } catch {
    dot.classList.remove("degraded");
    dot.classList.add("down");
  }
}

refresh();
setInterval(refresh, 5000);
