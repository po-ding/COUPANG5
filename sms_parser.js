import * as Data from './data.js';
import * as Utils from './utils.js';

/**
 * [최종 개선] 문자 분석 - 날짜 무시, 분석 결과 수정 가능 필드 제공
 */
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
        return l.length > 5 && !l.includes("Web발신");
    });

    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line, lineIdx) => {
        let cleaned = line.trim();
        
        // 1. [날짜 패턴 완벽 제거] 상/하차지로 오인될 수 있는 "1월 1일", "12-25" 등 제거
        cleaned = cleaned.replace(/\d{1,2}월\s*\d{1,2}일/g, " "); // X월 X일 제거
        cleaned = cleaned.replace(/\d{1,2}[\/\-\.]\d{1,2}/g, " "); // 12/25, 12-25, 12.25 제거
        cleaned = cleaned.replace(/배차표|운송장/g, " "); // "배차표" 같은 단어 제거
        
        // 기타 노이즈 제거
        cleaned = cleaned.replace(/\d+층\s*->\s*\d+층/g, " ");
        cleaned = cleaned.replace(/\d{1,2}:\d{2}/g, " ");
        cleaned = cleaned.replace(/[1-9][0-9]?T/g, " ");

        let matches = [];
        let searchQueue = cleaned.toUpperCase();

        // 등록지 매칭
        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            let pos = searchQueue.indexOf(centerUpper);
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                searchQueue = searchQueue.substring(0, pos) + " ".repeat(center.length) + searchQueue.substring(pos + center.length);
            }
        });

        matches.sort((a, b) => a.index - b.index);

        let finalFrom = matches[0] ? matches[0].name : "";
        let finalTo = matches[1] ? matches[1].name : "";

        // 매칭 실패 시 단어 기준 추출 (날짜가 이미 제거된 상태라 안전함)
        if (!finalFrom || !finalTo) {
            const words = cleaned.split(/\s+/).filter(w => w.trim().length >= 2);
            if (!finalFrom) finalFrom = words[0] || "";
            if (!finalTo) finalTo = words[1] || "";
        }

        if(!finalFrom && !finalTo) return;

        // --- UI 구성 ---
        const itemDiv = document.createElement('div');
        itemDiv.className = "sms-item-card";
        itemDiv.style = "background:white; padding:12px; border-radius:6px; margin-bottom:12px; border:2px solid #fab005; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";

        // 상차지/하차지 정보를 수정 가능한 Input으로 생성
        const buildLocInput = (label, id, value, color) => {
            const locInfo = Data.MEM_LOCATIONS[value];
            const needsInfo = !locInfo || !locInfo.address; // 주소 정보가 없는가?
            
            return `
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:0.75em; color:#666; font-weight:bold;">${label}</span>
                    <input type="text" id="${id}-name" value="${value}" 
                        style="border:1px solid ${color}; border-radius:4px; padding:6px; font-weight:bold; color:${color}; font-size:0.95em;">
                    ${needsInfo ? `
                        <input type="text" id="${id}-addr" placeholder="주소 정보 없음(입력)" 
                            style="border:1px solid #ddd; border-radius:4px; padding:4px; font-size:0.8em; background:#fff9db;">
                        <input type="text" id="${id}-memo" placeholder="메모(담당자 등)" 
                            style="border:1px solid #ddd; border-radius:4px; padding:4px; font-size:0.8em;">
                    ` : `<div style="font-size:0.75em; color:#28a745;">✓ 주소 등록됨</div>`}
                </div>
            `;
        };

        itemDiv.innerHTML = `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                ${buildLocInput('상차지', `from-${lineIdx}`, finalFrom, '#007bff')}
                <div style="align-self:center; font-weight:bold; color:#ccc;">▶</div>
                ${buildLocInput('하차지', `to-${lineIdx}`, finalTo, '#dc3545')}
            </div>
            <button type="button" 
                onclick="window.registerParsedTripWithInfo(this, ${lineIdx})" 
                style="background:#28a745; color:white; border:none; padding:10px; border-radius:4px; font-size:0.9em; cursor:pointer; font-weight:bold; width:100%;">
                확인 및 기록 저장
            </button>
        `;
        resultsDiv.appendChild(itemDiv);
    });
}

/**
 * 수정된 입력값들을 읽어서 위치 정보를 저장하고 운행 기록을 등록
 */
export function registerParsedTripWithInfo(btn, lineIdx) {
    // 1. 입력된 값 읽기
    const fromName = document.getElementById(`from-${lineIdx}-name`).value.trim();
    const toName = document.getElementById(`to-${lineIdx}-name`).value.trim();
    
    const fromAddr = document.getElementById(`from-${lineIdx}-addr`)?.value.trim();
    const fromMemo = document.getElementById(`from-${lineIdx}-memo`)?.value.trim();
    
    const toAddr = document.getElementById(`to-${lineIdx}-addr`)?.value.trim();
    const toMemo = document.getElementById(`to-${lineIdx}-memo`)?.value.trim();

    if (!fromName || !toName) {
        alert("상/하차지 이름을 입력해주세요.");
        return;
    }

    // 2. 위치 정보 업데이트 (주소/메모가 입력된 경우에만)
    if (fromAddr || fromMemo) Data.updateLocationData(fromName, fromAddr, fromMemo);
    if (toAddr || toMemo) Data.updateLocationData(toName, toAddr, toMemo);

    // 3. 운행 기록 등록 (기존 운임/거리 정보 활용)
    const key = `${fromName}-${toName}`;
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    Data.addRecord({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: Utils.getCurrentTimeString(), 
        type: "화물운송",
        from: fromName, 
        to: toName, 
        distance: savedDistance, 
        income: savedIncome,
        cost: 0, liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    });
    
    // 4. UI 처리
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    const card = btn.closest('.sms-item-card');
    card.style.background = "#f8f9fa";
    card.style.opacity = "0.7";
    card.style.border = "1px solid #ddd";

    Utils.showToast(`${fromName} → ${toName} 저장됨`);
    
    // 화면 갱신
    if (window.updateAllDisplays) window.updateAllDisplays();
}