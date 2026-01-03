import * as Data from './data.js';
import * as Utils from './utils.js';

export function parseSmsText() {
    const inputEl = document.getElementById('sms-input');
    const input = inputEl ? inputEl.value : "";
    if (!input.trim()) {
        Utils.showToast("분석할 문자를 입력해주세요.");
        return;
    }

    const resultsDiv = document.getElementById('sms-parse-results');
    if(!resultsDiv) return;
    
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove('hidden');

    const lines = input.split('\n').filter(line => {
        const l = line.trim();
        return l.length > 5 && !/^\d+\.\d+$/.test(l) && !l.includes("Web발신");
    });

    let foundCount = 0;
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line) => {
        let originalText = line.trim();
        let cleaned = originalText.replace(/\d+층\s*->\s*\d+층/g, " "); 
        cleaned = cleaned.replace(/\[?\d+호\]?|\d+\s*호/g, " "); 
        cleaned = cleaned.replace(/\d{1,2}:\d{2}/g, " "); 
        cleaned = cleaned.replace(/[1-9][0-9]?T/g, " "); 
        cleaned = cleaned.replace(/\d+층/g, " "); 

        let matches = [];
        let searchQueue = cleaned.toUpperCase();

        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            let pos = searchQueue.indexOf(centerUpper);
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                searchQueue = searchQueue.substring(0, pos) + " ".repeat(center.length) + searchQueue.substring(pos + center.length);
            }
        });

        if (matches.length < 2) {
            const digitsInSms = cleaned.match(/\d+/g); 
            if (digitsInSms) {
                digitsInSms.forEach(num => {
                    sortedCenters.forEach(center => {
                        if (matches.find(m => m.name === center)) return;
                        const prefix = center.substring(0, 2);
                        if (cleaned.includes(prefix) && center.includes(num)) {
                            let pos = cleaned.indexOf(num);
                            if (!matches.find(m => m.index === pos)) {
                                matches.push({ name: center, index: pos });
                            }
                        }
                    });
                });
            }
        }

        matches.sort((a, b) => a.index - b.index);

        let finalFrom = "";
        let finalTo = "";

        if (matches.length >= 2) {
            finalFrom = matches[0].name;
            finalTo = matches[1].name;
        } else {
            const words = cleaned.split(/\s+/).filter(w => w.trim().length >= 2);
            if (words.length >= 2) {
                finalFrom = words[0];
                finalTo = words[1];
            } else return;
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = "sms-item-card";
        itemDiv.style = "background:white; padding:12px; border-radius:6px; margin-bottom:10px; border:1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;";
        
        itemDiv.innerHTML = `
            <div style="font-size:0.95em; color:#333;">
                <span style="font-weight:bold; color:#007bff;">${finalFrom}</span>
                <span style="margin:0 5px; color:#999;">→</span>
                <span style="font-weight:bold; color:#dc3545;">${finalTo}</span>
            </div>
            <button type="button" 
                onclick="window.registerParsedTrip(this, '${finalFrom.replace(/'/g, "\\'")}', '${finalTo.replace(/'/g, "\\'")}')" 
                style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:4px; font-size:0.85em; cursor:pointer; font-weight:bold; width:auto; flex-shrink:0;">
                운행 등록
            </button>
        `;
        resultsDiv.appendChild(itemDiv);
        foundCount++;
    });

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>정확한 구간을 분석하지 못했습니다. 등록지 이름을 확인해주세요.</p>";
}

export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    Data.addRecord({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", 
        type: "화물운송",
        from: from, to: to, distance: savedDistance, income: savedIncome,
        cost: 0, liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    });
    
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);
    if (window.updateAllDisplays) window.updateAllDisplays();
}