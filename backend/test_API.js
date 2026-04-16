
const nRequests = 1000;
const nThreads = 100;
const URL = 'http://localhost:3000/api/products';

// Gọi API thật
async function callAPI() {
    const start = Date.now();

    try {
        const res = await fetch(URL);
        await res.json(); // đọc data để giống thực tế
        return Date.now() - start;
    } catch (err) {
        return null; // lỗi bỏ qua
    }
}

// Chạy test
async function runTest() {
    let results = [];
    const startTime = Date.now();

    for (let i = 0; i < nRequests; i += nThreads) {
        let batch = [];

        for (let j = 0; j < nThreads && i + j < nRequests; j++) {
            const req = callAPI().then((time) => {
                if (time !== null) results.push(time);
            });

            batch.push(req);
        }

        // chạy song song theo batch
        await Promise.all(batch);
    }

    const endTime = Date.now();
    const totalTimeSec = (endTime - startTime) / 1000;
    const tps = results.length / totalTimeSec;

    analyze(results, tps);
}

// Hàm tính percentile
function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
}

// Phân tích
function analyze(times, tps) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    console.log("\n===== RESULT =====");
    console.log("Total requests:", times.length);
    console.log("TPS:", tps.toFixed(2), "req/s");
    console.log("Average:", avg.toFixed(2), "ms");
    console.log("P50:", percentile(times, 50), "ms");
    console.log("P90:", percentile(times, 90), "ms");
    console.log("P99:", percentile(times, 99), "ms");
    console.log("Max:", max, "ms");
}

// chạy
runTest();