import { formatToManwon, getStatisticalDate, getTodayString } from './utils.js';
import { MEM_RECORDS, MEM_LOCATIONS } from './data.js';

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

    // .summary-value 에 style="display:none"을 주어 초기에는 숨김
    let itemsHtml = metrics.map(m => `
        <div class="summary-item">
            <span class="summary-label">${m.label}</span>
            <span class="summary-value ${m.className || ''}" style="display:none;">${m.value}${m.unit}</span>
        </div>
    `).join('');

    return `
        <div class="summary-card-container" onclick="this.querySelectorAll('.summary-value').forEach(v => v.style.display = (v.style.display==='none'?'inline':'none'))">
            <div class="summary-title-area">
                ${title} <span style="font-size:0.75em; color:#999; font-weight:normal;">(클릭하여 상세 보기)</span>
            </div>
            <div class="summary-toggle-grid">
                ${itemsHtml}
            </div>
        </div>
    `;
}

export function displayTodayRecords(date) {
    const todayTbody = document.querySelector('#today-records-table tbody');
    const todaySummaryDiv = document.getElementById('today-summary');
    if(!todayTbody) return;
    const dayRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time) === date)
                                  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    todayTbody.innerHTML = '';
    dayRecords.filter(r => r.type !== '운행종료').forEach(r => {
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
                endTime = next.time;
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
            
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td data-label="종료">${endTime}</td><td data-label="소요">${duration}</td><td data-label="상차" class="location-clickable" data-center="${r.from}">${r.from || ''}</td><td data-label="하차" class="location-clickable" data-center="${r.to}">${r.to || ''}</td><td data-label="비고">${r.distance ? r.distance + 'km' : '-'}</td><td data-label="금액">${money}</td>`;
        } else {
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td colspan="5" style="text-align:left; padding-left:20px;">[${r.type}] ${r.expenseItem || r.brand || ''}</td><td data-label="금액">${money}</td>`;
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
    if(dailySummaryDiv) dailySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 총계`, monthRecords);
    
    const recordsByDate = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        if(!recordsByDate[statDate]) recordsByDate[statDate] = { records: [] };
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
        tr.innerHTML = `<td data-label="일">${parseInt(date.substring(8,10))}일</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산"><strong>${formatToManwon(inc-exp-fuel)}</strong></td><td data-label="거리">${dist.toFixed(0)}</td><td data-label="건수">${count}</td><td data-label="소요">${calculateTotalDuration(dayData.records)}</td><td data-label="관리"><button class="edit-btn" onclick="window.viewDateDetails('${date}')">상세</button></td>`;
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
        let inc = 0, exp = 0, fuel = 0, dist = 0;
        data.forEach(r => { 
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if(r.type!=='운행종료'&&r.type!=='운행취소'){ inc+=safeInt(r.income); exp+=safeInt(r.cost); } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);} 
        });
        const dates = data.map(r => new Date(getStatisticalDate(r.date, r.time)).getDate());
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="주차">${w}주</td><td data-label="기간">${Math.min(...dates)}~${Math.max(...dates)}</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(0)}</td><td data-label="소요">${calculateTotalDuration(data)}</td>`;
        if(weeklyTbody) weeklyTbody.appendChild(tr);
    });
}

export function displayMonthlyRecords() {
    const yearSelect = document.getElementById('monthly-year-select');
    if(!yearSelect) return;
    const year = yearSelect.value, monthlyTbody = document.querySelector('#monthly-summary-table tbody'), monthlyYearlySummaryDiv = document.getElementById('monthly-yearly-summary');
    const yearRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(year));
    if(monthlyYearlySummaryDiv) monthlyYearlySummaryDiv.innerHTML = createSummaryHTML(`${year}년 총계`, yearRecords);
    if(monthlyTbody) monthlyTbody.innerHTML = '';
    
    const months = {};
    yearRecords.forEach(r => { 
        const m = getStatisticalDate(r.date, r.time).substring(0,7); 
        if(!months[m]) months[m]={records:[]}; 
        months[m].records.push(r); 
    });
    
    Object.keys(months).sort().reverse().forEach(m => {
        const data = months[m];
        let inc=0,exp=0,fuel=0,dist=0;
        data.records.forEach(r => { 
            if(r.type === '주유소') fuel += safeInt(r.cost);
            else if(r.type!=='운행종료'&&r.type!=='운행취소'){ inc+=safeInt(r.income); exp+=safeInt(r.cost); } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);} 
        });
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="월">${parseInt(m.substring(5))}월</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(0)}</td><td data-label="소요">${calculateTotalDuration(data.records)}</td>`;
        if(monthlyTbody) monthlyTbody.appendChild(tr);
    });
}

export function displayCurrentMonthData() {
    const now = new Date();
    const currentPeriod = now.toISOString().slice(0, 7); 
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(currentPeriod)); 
    let inc = 0, exp = 0, liters = 0; 
    monthRecords.forEach(r => { 
        inc += safeInt(r.income); exp += safeInt(r.cost); 
        if(r.type === '주유소') liters += safeFloat(r.liters); 
    }); 
    const limit = parseFloat(localStorage.getItem("fuel_subsidy_limit")) || 0; 
    const pct = limit > 0 ? Math.min(100, 100 * liters / limit).toFixed(1) : 0; 
    const subSum = document.getElementById('subsidy-summary');
    if(subSum) subSum.innerHTML = `<div class="progress-label">월 한도: ${limit}L | 사용: ${liters.toFixed(1)}L</div><div class="progress-bar-container"><div class="progress-bar progress-bar-used" style="width: ${pct}%;"></div></div>`; 
}

export function displayCumulativeData() {
    const records = MEM_RECORDS.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let inc = 0, exp = 0, dist = 0;
    records.forEach(r => {
        inc += safeInt(r.income); exp += safeInt(r.cost);
        if(r.type === '화물운송') dist += safeFloat(r.distance);
    });
    const totalDist = dist + (parseFloat(localStorage.getItem("mileage_correction")) || 0);
    if(document.getElementById('cumulative-operating-days')) document.getElementById('cumulative-operating-days').textContent = new Set(records.map(r => getStatisticalDate(r.date, r.time))).size + "일";
    if(document.getElementById('cumulative-total-mileage')) document.getElementById('cumulative-total-mileage').textContent = Math.round(totalDist).toLocaleString() + "km";
    if(document.getElementById('cumulative-net-income')) document.getElementById('cumulative-net-income').textContent = formatToManwon(inc-exp) + "만원";
}

export function displaySubsidyRecords(append = false) {
    const list = document.getElementById('subsidy-records-list'), fuelRecords = MEM_RECORDS.filter(r => r.type === '주유소').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (!append) { displayedSubsidyCount = 0; if(list) list.innerHTML = ''; }
    fuelRecords.slice(displayedSubsidyCount, displayedSubsidyCount + 10).forEach(r => {
        const div = document.createElement('div'); div.className = 'center-item';
        div.innerHTML = `<div class="info"><span>${r.date}</span><strong>${formatToManwon(safeInt(r.cost))}만원</strong></div>`;
        if(list) list.appendChild(div);
    });
    displayedSubsidyCount += 10;
}