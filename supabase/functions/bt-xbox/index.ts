// Xbox activity was removed from Beaver Transceiver.
Deno.serve(() => new Response(JSON.stringify({ error: "removed" }), { status: 410, headers: { "Content-Type": "application/json" } }));
