import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, MEM_RECORDS, MEM_FARES, MEM_DISTANCES, MEM_COSTS, MEM_EXPENSE_ITEMS } from './data.js';

export function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    const sections = ['transport-details', 'fuel-details', 'supply-details', 'expense-details', 'cost-info-fieldset', 'trip-actions', 'general-actions', 'edit-actions'];
    sections.forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
    
    if (type === '화물운송' || type === '대기') {
        document.getElementById('transport-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        document.getElementById('cost-wrapper')?.classList.add('hidden');
        document.getElementById('income-wrapper')?.classList.remove('hidden');
    } else {
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        document.getElementById('income-wrapper')?.classList.add('hidden');
        document.getElementById('cost-wrapper')?.classList.remove('hidden');
        if (type === '주유소') document.getElementById('fuel-details')?.classList.remove('hidden');
        else if (type === '지출') document.getElementById('expense-details')?.classList.remove('hidden');
    }

    if (isEditMode) {
        document.getElementById('edit-actions')?.classList.remove('hidden'); 
    } else {
        if (['화물운송', '대기'].includes(type)) document.getElementById('trip-actions')?.classList.remove('hidden');
        else document.getElementById('general-actions')?.classList.remove('hidden');
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
    toggleUI(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function displayCenterList(filter='') {
    const container = document.getElementById('center-list-container');
    if(!container) return;
    container.innerHTML = "";
    MEM_CENTERS.filter(c => c.toLowerCase().includes(filter.toLowerCase())).forEach(c => {
        const div = document.createElement('div');
        div.className='center-item';
        div.innerHTML=`<span>${c}</span>`;
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
    const displayEl = document.getElementById('address-display');
    if(displayEl) displayEl.textContent = fromLoc.address || '';
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

    // 아코디언 상태 초기화 (닫기)
    document.querySelectorAll('.section-toggle-body').forEach(b => b.classList.add('hidden'));
    document.querySelectorAll('.section-toggle-label').forEach(l => l.classList.remove('active'));

    toggleUI();
}

export function renderFrequentLocationButtons() {
    const fromContainer = document.getElementById('top-from-centers');
    const toContainer = document.getElementById('top-to-centers');
    if (!fromContainer || !toContainer) return;
    const fromCounts = {}, toCounts = {};
    MEM_RECORDS.forEach(r => {
        if (r.type === '화물운송') {
            if (r.from) fromCounts[r.from] = (fromCounts[r.from] || 0) + 1;
            if (r.to) toCounts[r.to] = (toCounts[r.to] || 0) + 1;
        }
    });
    const build = (data, container, targetId) => {
        container.innerHTML = '';
        Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([name]) => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'quick-loc-btn'; btn.textContent = name;
            btn.onclick = () => { document.getElementById(targetId).value = name; updateAddressDisplay(); };
            container.appendChild(btn);
        });
    };
    build(fromCounts, fromContainer, 'from-center');
    build(toCounts, toContainer, 'to-center');
}