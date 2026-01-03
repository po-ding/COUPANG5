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

    lines.forEach((line, lineIdx) => {
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

        // --- 주소 정보 확인 및 입력 필드 구성 ---
        const locations = [finalFrom, finalTo];
        let quickAddHtml = "";
        
        locations.forEach((loc, i) => {
            const locInfo = Data.MEM_LOCATIONS[loc];
            // 주소 정보가 없는 경우에만 입력 필드 노출
            if (!locInfo || !locInfo.address) {
                quickAddHtml += `
                <div class="quick-loc-input-group" style="margin-top:8px; padding-top:8px; border-top:1px dashed #eee;">
                    <div style="font-size:0.8em; color:#666; margin-bottom:4px;">📍 <b>${loc}</b> 정보 추가</div>
                    <input type="text" id="sms-addr-${lineIdx}-${i}" placeholder="주소 입력" style="width:100%; font-size:0.85em; padding:5px; margin-bottom:4px; border:1px solid #ddd; border-radius:3px;">
                    <input type="text" id="sms-memo-${lineIdx}-${i}" placeholder="메모(담당자 등)" style="width:100%; font-size:0.85em; padding:5px; border:1px solid #ddd; border-radius:3px;">
                </div>`;
            }
        });

        const itemDiv = document.createElement('div');
        itemDiv.className = "sms-item-card";
        itemDiv.style = "background:white; padding:12px; border-radius:6px; margin-bottom:10px; border:1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:5px;";
        
        itemDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.95em; color:#333;">
                    <span style="font-weight:bold; color:#007bff;">${finalFrom}</span>
                    <span style="margin:0 5px; color:#999;">→</span>
                    <span style="font-weight:bold; color:#dc3545;">${finalTo}</span>
                </div>
                <button type="button" 
                    onclick="window.registerParsedTripWithInfo(this, ${lineIdx}, '${finalFrom.replace(/'/g, "\\'")}', '${finalTo.replace(/'/g, "\\'")}')" 
                    style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:4px; font-size:0.85em; cursor:pointer; font-weight:bold; width:auto;">
                    저장 및 등록
                </button>
            </div>
            ${quickAddHtml}
        `;
        resultsDiv.appendChild(itemDiv);
        foundCount++;
    });

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>분석된 구간이 없습니다.</p>";
}

/**
 * 주소 정보와 함께 등록하는 함수
 */
export function registerParsedTripWithInfo(btn, lineIdx, from, to) {
    // 1. 주소 및 메모 정보 업데이트 (입력된 경우)
    const locations = [from, to];
    locations.forEach((loc, i) => {
        const addrIn = document.getElementById(`sms-addr-${lineIdx}-${i}`);
        const memoIn = document.getElementById(`sms-memo-${lineIdx}-${i}`);
        
        const address = addrIn ? addrIn.value.trim() : null;
        const memo = memoIn ? memoIn.value.trim() : null;

        if (address || memo) {
            Data.updateLocationData(loc, address, memo);
        }
    });

    // 2. 운행 기록 등록
    const key = `${from}-${to}`;
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    Data.addRecord({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: Utils.getCurrentTimeString(), 
        type: "화물운송",
        from: from, to: to, distance: savedDistance, income: savedIncome,
        cost: 0, liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    });
    
    // UI 상태 업데이트
    btn.disabled = true;
    btn.textContent = "완료";
    btn.style.background = "#bdc3c7";
    const card = btn.closest('.sms-item-card');
    card.style.background = "#f0fdf4";
    // 입력 필드들 숨기기
    card.querySelectorAll('.quick-loc-input-group').forEach(el => el.style.display = 'none');

    Utils.showToast("위치 정보 및 운행 기록 저장됨");
    
    // 메인 화면 갱신 (리프레쉬 없이 데이터 반영)
    if (window.updateAllDisplays) window.updateAllDisplays();
}