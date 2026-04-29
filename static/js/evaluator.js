export function getContrastScore(hex1, hex2) {
    const r1 = parseInt(hex1.substring(1,3), 16), g1 = parseInt(hex1.substring(3,5), 16), b1 = parseInt(hex1.substring(5,7), 16);
    const r2 = parseInt(hex2.substring(1,3), 16), g2 = parseInt(hex2.substring(3,5), 16), b2 = parseInt(hex2.substring(5,7), 16);
    const l1 = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
    const l2 = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
    return Math.min(100, Math.round((Math.abs(l1 - l2) / 200) * 100));
}

export function initRadarChart(scores, currentChart) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (currentChart) currentChart.destroy();
    return new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['視認性', '構成', '認知負荷'],
            datasets: [{
                data: [scores.visibility, scores.layout, scores.cognitive],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                borderWidth: 4,
                pointRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 40 },
            scales: { 
                r: { 
                    min: 0, max: 100, 
                    ticks: { display: false }, 
                    grid: { color: '#e2e8f0' }, 
                    angleLines: { color: '#e2e8f0' },
                    pointLabels: { display: false } 
                } 
            },
            plugins: { legend: { display: false } }
        }
    });
}

// API版ではプロンプトはサーバー側で管理するため、フロントエンドでのロードは不要
// export async function loadAIPrompt() { ... }

// Gemma 3 APIを使用してサーバー側で評価を行う
export async function generateAIInsight(generator, category, score, params) {
    try {
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: category,
                score: score,
                params: params
                // promptの送信も不要になりました
            })
        });
        
        const data = await response.json();
        return data;
    } catch (e) {
        return { 
            grade: "Error", 
            score: 0, 
            reasons: ["通信エラー"], 
            advice: "サーバーとの通信に失敗しました。APIキーを確認してください。" 
        };
    }
}
