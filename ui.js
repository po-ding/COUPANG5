/** ui.js */
import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, MEM_RECORDS, MEM_FARES, MEM_DISTANCES, MEM_COSTS, MEM_EXPENSE_ITEMS } from './data.js';

export function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    const smsSection = document.getElementById('sms-parser-section');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    const sections = ['transport-details', 'fuel-details', 'supply-details', 'expense-details', 'cost-info-fieldset', 'trip-actions', 'general-actions', 'edit-actions'];
    sections.forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
    
    const costWrapper = document.getElementById('cost-wrapper');
    const incomeWrapper = document.getElementById('income-wrapper');

    if (type === '화물운송' || type === '대기') {
        document.getElementById('transport-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        costWrapper?.classList.add('hidden');
        incomeWrapper?.classList.remove('hidden');
    } else {
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        incomeWrapper?.classList.add('hidden');
        costWrapper?.classList.remove('hidden');
        if (type === '주유소') document.getElementById('fuel-details')?.classList.remove('hidden');
        else if (type === '지출') document.getElementById('expense-details')?.classList.remove('hidden');
    }

    if (isEditMode) {
        document.getElementById('edit-actions')?.classList.remove('hidden'); 
        smsSection?.classList.add('hidden'); 
    } else {
        smsSection?.classList.remove('hidden');
        if (['화물운송', '대기'].includes(type)) {
            document.getElementById('trip-actions')?.classList.remove('hidden');
        } else {
            document.getElementById('general-actions')?.classList.remove('hidden');
        }
    }
}

export function editRecord(id) {
    const r = MEM_RECORDS.find(x => x.id === id);
    if(!r) return;

    document.getElementById('date').value = r.date; 
    document.getElementById('time').value = r.time; 
    document.getElementById('type').value = r.type;
    document.getElementById('from-center').value = r.from || ''; 
    document.getElementById('to-center').value = r.to || '';
    document.getElementById('manual-distance').value = r.distance || ''; 
    document.getElementById('income').value = r.income ? (r.income/10000) : ''; 
    document.getElementById('cost').value = r.cost ? (r.cost/10000) : '';
    document.getElementById('edit-id').value = id; 
    
    document.getElementById('edit-mode-indicator')?.classList.remove('hidden');
    document.getElementById('date').disabled = true; 
    document.getElementById('time').disabled = true;
    
    // 수정 시 아코디언은 닫혀있어도 되지만, 입력을 위해 열어주고 싶다면 아래 주석 해제
    // document.querySelectorAll('.section-toggle-body').forEach(b => b.classList.remove('hidden'));

    toggleUI(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function displayCenterList(filter='') {
    const container = document.getElementById('center-list-container');
    if(!container) return;
    container.innerHTML = "";
    const list = MEM_CENTERS.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
    list.forEach(c => {
        const div = document.createElement('div');
        div.className='center-item';
        div.innerHTML=`<div class="info"><span class="center-name">${c}</span></div>`;
        container.appendChild(div);
    });
}

export function populateCenterDatalist() {
    const dl = document.getElementById('center-list');
    if(dl) dl.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}

export function populateExpenseDatalist() {
    const dl = document.getElementById('expense-list');
    if(dl) dl.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
}

export function updateAddressDisplay() {
    const fromVal = document.getElementById('from-center').value;
    const fromLoc = MEM_LOCATIONS[fromVal] || {};
    let html = '';
    if (fromLoc.address) html += `<div class="address-clickable" data-address="${fromLoc.address}">${fromLoc.address}</div>`;
    const displayEl = document.getElementById('address-display');
    if(displayEl) displayEl.innerHTML = html;
}

export function getFormDataWithoutTime() {
    return {
        type: document.getElementById('type').value,
        from: document.getElementById('from-center').value.trim(),
        to: document.getElementById('to-center').value.trim(),
        distance: parseFloat(document.getElementById('manual-distance').value) || 0,
        cost: Math.round((parseFloat(document.getElementById('cost').value) || 0) * 10000),
        income: Math.round((parseFloat(document.getElementById('income').value) || 0) * 10000)
    };
}

export function resetForm() {
    document.getElementById('record-form')?.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-mode-indicator')?.classList.add('hidden');
    document.getElementById('date').value = getTodayString();
    document.getElementById('time').value = getCurrentTimeString();
    document.getElementById('date').disabled = false;
    document.getElementById('time').disabled = false;

    // [추가] 아코디언 폼 리셋 (모두 닫기)
    document.querySelectorAll('.section-toggle-body').forEach(b => b.classList.add('hidden'));
    document.querySelectorAll('.section-toggle-label').forEach(l => l.classList.remove('active'));

    toggleUI();
}

export function renderFrequentLocationButtons() {
    const fromContainer = document.getElementById('top-from-centers');
    const toContainer = document.getElementById('top-to-centers');
    if (!fromContainer || !toContainer) return;
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const fromCounts = {}, toCounts = {};
    MEM_RECORDS.forEach(r => {
        const recordDate = new Date(r.date);
        if ((r.type === '화물운송' || r.type === '대기') && recordDate >= twoWeeksAgo) {
            if (r.from) fromCounts[r.from] = (fromCounts[r.from] || 0) + 1;
            if (r.to) toCounts[r.to] = (toCounts[r.to] || 0) + 1;
        }
    });
    const buildButtons = (data, container, targetInputId) => {
        container.innerHTML = '';
        const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,5);
        if (sorted.length === 0) container.style.display = 'none'; 
        else container.style.display = 'grid'; 
        sorted.forEach(([name]) => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'quick-loc-btn'; btn.textContent = name;
            btn.onclick = () => {
                const input = document.getElementById(targetInputId);
                if(input) { input.value = name; input.dispatchEvent(new Event('input')); }
            };
            container.appendChild(btn);
        });
    };
    buildButtons(fromCounts, fromContainer, 'from-center');
    buildButtons(toCounts, toContainer, 'to-center');
}