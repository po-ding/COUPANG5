import { formatToManwon, getStatisticalDate, getTodayString } from './utils.js';
import { MEM_RECORDS, MEM_LOCATIONS } from './data.js';

let displayedSubsidyCount = 0;

function safeInt(value) {
    if (!value) return 0;
    const num = parseInt(String(value).replace(/,/g, ''), 10);
    return isNaN(num) ? 0 : num;
}

function safeFloat(value) {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

export function calculateTotalDuration(records) {
    const sorted = [...records].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    let totalMinutes = 0;
    if (sorted.length < 2) return '0h 0m';
    for (let i = 1; i < sorted.length; i++) {
        const curr = new Date(`${sorted[i].date}T${sorted[i].time}`);
        const prev = new Date(`${sorted[i-1].date}T${sorted[i-1].time}`);
        if (sorted[i-1].type !== '운행종료') {
            totalMinutes += (curr - prev) / 60000;
        }
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
}

export function createSummaryHTML(title, records) {
    const validRecords = records.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let totalIncome = 0, totalExpense = 0, totalDistance = 0, totalTripCount = 0;
    let totalFuelCost = 0, totalFuelLiters = 0;
    
    validRecords.forEach(r => {
        totalIncome += safeInt(r.income);
        totalExpense += safeInt(r.cost);
        if (r.type === '주유소') { 
            totalFuelCost += safeInt(r.cost); 
            totalFuelLiters += safeFloat(r.liters); 
        }
        if (['화물운송'].includes(r.type)) { 
            totalDistance += safeFloat(r.distance); 
            totalTripCount++; 
        }
    });

    const netIncome = totalIncome - totalExpense;
    
    const metrics = [
        { label: '수입', value: formatToManwon(totalIncome), unit: ' 만원', className: 'income' },
        { label: '지출', value: formatToManwon(totalExpense), unit: ' 만원', className: 'cost' },
        { label: '정산', value: formatToManwon(netIncome), unit: ' 만원', className: 'net' },
        { label: '운행거리', value: totalDistance.toFixed(1), unit: ' km' },
        { label: '운행건수', value: totalTripCount, unit: ' 건' },
        { label: '주유금액', value: formatToManwon(totalFuelCost), unit: ' 만원', className: 'cost' },
        { label: '주유리터', value: totalFuelLiters.toFixed(2), unit: ' L' },
    ];
    let itemsHtml = metrics.map(m => `<div class="summary-item"><span class="summary-label">${m.label}</span><span class="summary-value ${m.className || ''} hidden">${m.value}${m.unit}</span></div>`).join('');
    return `<strong>${title}</strong><div class="summary-toggle-grid" onclick="window.toggleAllSummaryValues(this)">${itemsHtml}</div>`;
}

export function displayTodayRecords(date) {
    const todayTbody = document.querySelector('#today-records-table tbody');
    const todaySummaryDiv = document.getElementById('today-summary');
    if(!todayTbody) return;
    const dayRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time) === date)
                                  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    todayTbody.innerHTML = '';
    const displayList = dayRecords.filter(r => r.type !== '운행종료');
    displayList.forEach(r => {
        const tr = document.createElement('tr');
        tr.dataset.id = r.id; 
        let timeDisplay = r.time;
        if(r.date !== date) { timeDisplay = `<span style="font-size:0.8em; color:#888;">(익일)</span> ${r.time}`; }
        let money = '';
        const inc = safeInt(r.income);
        const cst = safeInt(r.cost);
        if(inc > 0) money += `<span class="income">+${formatToManwon(inc)}</span> `;
        if(cst > 0) money += `<span class="cost">-${formatToManwon(cst)}</span>`;
        if(money === '') money = '0'; 
        const isTransport = (r.type === '화물운송' || r.type === '대기' || r.type === '운행취소');
        if (isTransport) {
            let endTime = '진행중';
            let duration = '-';
            const idx = MEM_RECORDS.findIndex(item => item.id === r.id);
            if (idx > -1 && idx < MEM_RECORDS.length - 1) {
                const next = MEM_RECORDS[idx + 1];
                endTime = (next.date !== r.date) ? `<span style="font-size:0.8em; color:#888;">(${next.date.substring(5)})</span><br>${next.time}` : next.time;
                const startObj = new Date(`${r.date}T${r.time}`);
                const endObj = new Date(`${next.date}T${next.time}`);
                const diff = endObj - startObj;
                if (diff >= 0) {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                }
            }
            if(endTime === '진행중') tr.classList.add('row-in-progress');
            else tr.classList.add('row-completed');
            const fromLoc = MEM_LOCATIONS[r.from] || {}, toLoc = MEM_LOCATIONS[r.to] || {};
            let fromCell = `<span class="location-clickable" data-center="${(r.from||'').replace(/"/g, '&quot;')}">${r.from || ''}</span>`;
            if (fromLoc.memo) fromCell += `<span class="table-memo">${fromLoc.memo}</span>`;
            let toCell = `<span class="location-clickable" data-center="${(r.to||'').replace(/"/g, '&quot;')}">${r.to || ''}</span>`;
            if (toLoc.memo) toCell += `<span class="table-memo">${toLoc.memo}</span>`;
            let noteCell = '';
            if(r.distance) noteCell = `<span class="note">${safeFloat(r.distance)} km</span>`;
            if(r.type === '대기') noteCell = `<span class="note">대기중</span>`;
            if(r.type === '운행취소') noteCell = `<span class="note cancelled">취소됨</span>`;
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td data-label="종료">${endTime}</td><td data-label="소요">${duration}</td><td data-label="상차">${fromCell}</td><td data-label="하차">${toCell}</td><td data-label="비고">${noteCell}</td><td data-label="금액">${money}</td>`;
        } else {
            const detail = r.expenseItem || r.supplyItem || r.brand || '';
            const content = `<span style="font-weight:bold; color:#555;">[${r.type}]</span>&nbsp;&nbsp;${detail}`;
            if(r.type === '운행종료') tr.classList.add('row-end');
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td colspan="5" data-label="" style="color:#333;">${content}</td><td data-label="금액">${money}</td>`;
        }
        todayTbody.appendChild(tr);
    });
    if(todaySummaryDiv) todaySummaryDiv.innerHTML = createSummaryHTML('오늘의 기록 (04시 기준)', dayRecords);
}

export function displayDailyRecords() {
    const yearSelect = document.getElementById('daily-year-select'), monthSelect = document.getElementById('daily-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value, month = monthSelect.value, selectedPeriod = `${year}-${month}`;
    const dailyTbody = document.querySelector('#daily-summary-table tbody'), dailySummaryDiv = document.getElementById('daily-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(dailyTbody) dailyTbody.innerHTML = '';
    if(dailySummaryDiv) dailySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 총계 (04시 기준)`, monthRecords);
    const recordsByDate = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        if(!recordsByDate[statDate]) recordsByDate[statDate] = { records: [], income: 0, expense: 0, fuel: 0, distance: 0, tripCount: 0 };
        recordsByDate[statDate].records.push(r);
    });
    Object.keys(recordsByDate).sort().reverse().forEach(date => {
        const dayData = recordsByDate[date];
        let inc = 0, exp = 0, fuel = 0, dist = 0, count = 0;
        dayData.records.forEach(r => {
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if (r.type !== '운행종료' && r.type !== '운행취소') { inc += safeInt(r.income); exp += safeInt(r.cost); }
            if(r.type === '화물운송') { dist += safeFloat(r.distance); count++; }
        });
        const tr = document.createElement('tr');
        if(date === getTodayString()) tr.style.fontWeight = 'bold';
        tr.innerHTML = `<td data-label="일">${parseInt(date.substring(8,10))}일</td><td data-label="수입"><span class="income">${formatToManwon(inc)}</span></td><td data-label="지출"><span class="cost">${formatToManwon(exp)}</span></td><td data-label="주유"><span class="cost">${formatToManwon(fuel)}</span></td><td data-label="정산"><strong>${formatToManwon(inc-exp-fuel)}</strong></td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(dayData.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type)))}</td><td data-label="관리"><button class="edit-btn" onclick="window.viewDateDetails('${date}')">상세</button></td>`;
        if(dailyTbody) dailyTbody.appendChild(tr);
    });
}

export function displayWeeklyRecords() {
    const yearSelect = document.getElementById('weekly-year-select'), monthSelect = document.getElementById('weekly-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value, month = monthSelect.value, selectedPeriod = `${year}-${month}`;
    const weeklyTbody = document.querySelector('#weekly-summary-table tbody'), weeklySummaryDiv = document.getElementById('weekly-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(weeklyTbody) weeklyTbody.innerHTML = '';
    if(weeklySummaryDiv) weeklySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 주별`, monthRecords);
    const weeks = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time), d = new Date(statDate);
        const w = Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay())) / 7);
        if(!weeks[w]) weeks[w] = [];
        weeks[w].push(r);
    });
    Object.keys(weeks).forEach(w => {
        const data = weeks[w];
        let inc = 0, exp = 0, fuel = 0, dist = 0, count = 0;
        data.forEach(r => { 
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if(r.type!=='운행종료'&&r.type!=='운행취소'){ inc+=safeInt(r.income); exp+=safeInt(r.cost); } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const dates = data.map(r => new Date(getStatisticalDate(r.date, r.time)).getDate());
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="주차">${w}주차</td><td data-label="기간">${Math.min(...dates)}일~${Math.max(...dates)}일</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(data.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type)))}</td>`;
        if(weeklyTbody) weeklyTbody.appendChild(tr);
    });
}

export function displayMonthlyRecords() {
    const yearSelect = document.getElementById('monthly-year-select');
    if(!yearSelect) return;
    const year = yearSelect.value, monthlyTbody = document.querySelector('#monthly-summary-table tbody'), monthlyYearlySummaryDiv = document.getElementById('monthly-yearly-summary');
    const yearRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(year));
    if(monthlyYearlySummaryDiv) monthlyYearlySummaryDiv.innerHTML = createSummaryHTML(`${year}년`, yearRecords);
    if(monthlyTbody) monthlyTbody.innerHTML = '';
    const months = {};
    yearRecords.forEach(r => { 
        const m = getStatisticalDate(r.date, r.time).substring(0,7); 
        if(!months[m]) months[m]={records:[]}; 
        months[m].records.push(r); 
    });
    Object.keys(months).sort().reverse().forEach(m => {
        const data = months[m];
        let inc=0,exp=0,fuel=0,dist=0,count=0;
         data.records.forEach(r => { 
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if(r.type!=='운행종료'&&r.type!=='운행취소'){ inc+=safeInt(r.income); exp+=safeInt(r.cost); } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="월">${parseInt(m.substring(5))}월</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(data.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type)))}</td>`;
        if(monthlyTbody) monthlyTbody.appendChild(tr);
    });
}

export function displayCurrentMonthData() {
    let checkDate = new Date();
    if(checkDate.getHours() < 4) checkDate.setDate(checkDate.getDate() - 1);
    const currentPeriod = checkDate.toISOString().slice(0, 7); 
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(currentPeriod) && r.type !== '운행취소' && r.type !== '운행종료'); 
    
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0; 
    monthRecords.forEach(r => { 
        inc += safeInt(r.income); exp += safeInt(r.cost); 
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); } 
        if(r.type === '주유소') liters += safeFloat(r.liters); 
    }); 
    
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    setTxt('current-month-title', `${parseInt(currentPeriod.split('-')[1])}월 실시간 요약 (04시 기준)`);
    setTxt('current-month-operating-days', `${new Set(monthRecords.map(r => getStatisticalDate(r.date, r.time))).size} 일`); 
    setTxt('current-month-trip-count', `${count} 건`); 
    setTxt('current-month-total-mileage', `${dist.toFixed(1)} km`); 
    setTxt('current-month-income', `${formatToManwon(inc)} 만원`); 
    setTxt('current-month-expense', `${formatToManwon(exp)} 만원`); 
    setTxt('current-month-net-income', `${formatToManwon(inc-exp)} 만원`); 
    setTxt('current-month-avg-economy', `${liters > 0 && dist > 0 ? (dist/liters).toFixed(2) : 0} km/L`); 
    setTxt('current-month-cost-per-km', `${dist > 0 ? Math.round(exp/dist).toLocaleString() : 0} 원`); 
    
    const limit = parseFloat(localStorage.getItem("fuel_subsidy_limit")) || 0; 
    const pct = limit > 0 ? Math.min(100, 100 * liters / limit).toFixed(1) : 0; 
    const subSum = document.getElementById('subsidy-summary');
    if(subSum) subSum.innerHTML = `<div class="progress-label">월 한도: ${limit.toLocaleString()} L | 사용: ${liters.toFixed(1)} L | 잔여: ${(limit-liters).toFixed(1)} L</div><div class="progress-bar-container"><div class="progress-bar progress-bar-used" style="width: ${pct}%;"></div></div>`; 
}

export function displayCumulativeData() {
    const records = MEM_RECORDS.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0;
    records.forEach(r => {
        inc += safeInt(r.income); exp += safeInt(r.cost);
        if(r.type === '주유소') liters += safeFloat(r.liters);
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); }
    });
    
    const totalDist = dist + (parseFloat(localStorage.getItem("mileage_correction")) || 0);
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    setTxt('cumulative-operating-days', `${new Set(records.map(r => getStatisticalDate(r.date, r.time))).size} 일`);
    setTxt('cumulative-trip-count', `${count} 건`);
    setTxt('cumulative-total-mileage', `${Math.round(totalDist).toLocaleString()} km`);
    setTxt('cumulative-income', `${formatToManwon(inc)} 만원`);
    setTxt('cumulative-expense', `${formatToManwon(exp)} 만원`);
    setTxt('cumulative-net-income', `${formatToManwon(inc-exp)} 만원`);
    setTxt('cumulative-avg-economy', `${liters > 0 && totalDist > 0 ? (totalDist/liters).toFixed(2) : 0} km/L`);
    setTxt('cumulative-cost-per-km', `${totalDist > 0 ? Math.round(exp/totalDist).toLocaleString() : 0} 원`);
    renderMileageSummary();
}

export function renderMileageSummary(period = 'monthly') {
    const validRecords = MEM_RECORDS.filter(r => ['화물운송'].includes(r.type));
    let summaryData = {};
    if (period === 'monthly') {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            summaryData[d.toISOString().slice(0, 7)] = 0;
        }
        validRecords.forEach(r => { 
            const k = getStatisticalDate(r.date, r.time).substring(0, 7); 
            if (summaryData.hasOwnProperty(k)) summaryData[k]++; 
        });
    }
    let h = '';
    for (const k in summaryData) h += `<div class="metric-card"><span class="metric-label">${k}</span><span class="metric-value">${summaryData[k]} 건</span></div>`;
    if(document.getElementById('mileage-summary-cards')) document.getElementById('mileage-summary-cards').innerHTML = h;
}

/** [중요] generatePrintView 함수: 상세 내역에서 운행거리 출력 로직 수정 */
export function generatePrintView(year, month, period, isDetailed) {
    const sDay = period === 'second' ? 16 : 1, eDay = period === 'first' ? 15 : 31;
    const target = MEM_RECORDS.filter(r => { 
        const statDate = getStatisticalDate(r.date, r.time), d = new Date(statDate); 
        return statDate.startsWith(`${year}-${month}`) && d.getDate() >= sDay && d.getDate() <= eDay && r.type !== '운행종료'; 
    }).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
    
    const transportList = target.filter(r => ['화물운송', '대기', '운행취소'].includes(r.type));
    const fuelList = target.filter(r => r.type === '주유소'), expenseList = target.filter(r => ['지출', '소모품'].includes(r.type)), incomeList = target.filter(r => r.type === '수입');

    let transInc = 0, transExp = 0, transDist = 0;
    transportList.forEach(r => { transInc += safeInt(r.income); transExp += safeInt(r.cost); transDist += safeFloat(r.distance); });
    let fuelTotalCost = 0, fuelTotalSubsidy = 0;
    fuelList.forEach(r => { fuelTotalCost += safeInt(r.cost); fuelTotalSubsidy += safeInt(r.subsidy); });
    let genExp = 0; expenseList.forEach(r => genExp += safeInt(r.cost));
    let genInc = 0; incomeList.forEach(r => genInc += safeInt(r.income));

    const totalRevenue = transInc + genInc, totalSpend = transExp + genExp + (fuelTotalCost - fuelTotalSubsidy); 

    const w = window.open('','_blank');
    let h = `<html><head><title>운송내역서</title><style>body { font-family: sans-serif; margin: 20px; } table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; } th, td { border: 1px solid #ccc; padding: 6px; text-align: center; } th { background: #eee; } .summary { border: 1px solid #ddd; padding: 15px; background: #f9f9f9; } .txt-red { color: red; } .txt-blue { color: blue; } .txt-green { color: green; font-weight: bold; }</style></head><body>
        <h2>${year}년 ${month}월 운송 기록</h2>
        <div class="summary"><p>근무일: ${new Set(transportList.map(r => getStatisticalDate(r.date, r.time))).size}일 | 거리: ${transDist.toFixed(1)}km</p><p class="txt-blue">총 수입: ${totalRevenue.toLocaleString()}원</p><p class="txt-red">총 지출: ${totalSpend.toLocaleString()}원</p><p class="txt-green">최종 순수익: ${(totalRevenue - totalSpend).toLocaleString()}원</p></div>
        <h3>1. 운송 상세 내역</h3>
        <table>
            <thead>
                <tr>
                    <th>날짜</th>
                    <th>상차지</th>
                    <th>하차지</th>
                    <th>상태</th>
                    ${isDetailed ? '<th>거리(km)</th><th>금액(원)</th>' : ''}
                </tr>
            </thead>
            <tbody>`;
            
    transportList.forEach(r => { 
        h += `<tr>
                <td>${getStatisticalDate(r.date, r.time).substring(5)}</td>
                <td>${r.from||''}</td>
                <td>${r.to||''}</td>
                <td>${r.type === '운행취소' ? '취소' : (r.type === '대기' ? '대기' : '운행')}</td>
                ${isDetailed ? `<td>${safeFloat(r.distance).toFixed(1)} km</td><td>${safeInt(r.income).toLocaleString()}</td>` : ''}
              </tr>`; 
    });
    
    h += `</tbody></table><button onclick="window.print()">인쇄</button></body></html>`;
    w.document.write(h); w.document.close();
}

export function displaySubsidyRecords(append = false) {
    const list = document.getElementById('subsidy-records-list'), fuelRecords = MEM_RECORDS.filter(r => r.type === '주유소').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (!append) { displayedSubsidyCount = 0; if(list) list.innerHTML = ''; }
    if (!fuelRecords.length) { if(list) list.innerHTML = '<p style="text-align:center;">내역 없음</p>'; return; }
    fuelRecords.slice(displayedSubsidyCount, displayedSubsidyCount + 10).forEach(r => {
        const div = document.createElement('div'); div.className = 'center-item';
        div.innerHTML = `<div class="info"><span>${r.date} (${r.brand || '기타'})</span><strong>${formatToManwon(safeInt(r.cost))} 만원</strong></div><div style="display:flex; justify-content:space-between; font-size:0.9em;"><span>${parseFloat(r.liters).toFixed(2)} L</span><span>단가: ${r.unitPrice} 원</span></div>`;
        if(list) list.appendChild(div);
    });
    displayedSubsidyCount += 10;
}