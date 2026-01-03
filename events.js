/** events.js */
import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';
import * as DateCtrl from './date_controls.js';
import { parseSmsText } from './sms_parser.js';

export function setupEventListeners(updateAllDisplays) {
    const getEl = (id) => document.getElementById(id);

    // [신규] 아코디언 토글 클릭 이벤트
    document.querySelectorAll('.section-toggle-label').forEach(label => {
        label.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetBody = document.getElementById(targetId);
            if (targetBody) {
                const isHidden = targetBody.classList.contains('hidden');
                if (isHidden) {
                    targetBody.classList.remove('hidden');
                    this.classList.add('active');
                } else {
                    targetBody.classList.add('hidden');
                    this.classList.remove('active');
                }
            }
        });
    });

    getEl('btn-parse-sms')?.addEventListener('click', parseSmsText);

    getEl('center-search-input')?.addEventListener('input', (e) => {
        UI.displayCenterList(e.target.value);
    });

    getEl('address-display')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('address-clickable')) {
            const addr = e.target.dataset.address;
            if (addr) Utils.copyTextToClipboard(addr, '주소 복사됨');
        }
    });

    document.querySelector('#today-records-table tbody')?.addEventListener('click', (e) => {
        const addrTarget = e.target.closest('.location-clickable');
        if (addrTarget) {
            const center = addrTarget.getAttribute('data-center');
            const loc = Data.MEM_LOCATIONS[center];
            if(loc && loc.address) Utils.copyTextToClipboard(loc.address, '주소 복사됨');
            else Utils.copyTextToClipboard(center, '이름 복사됨');
            return;
        }
        const rowTarget = e.target.closest('tr');
        if (rowTarget && rowTarget.dataset.id) {
            UI.editRecord(parseInt(rowTarget.dataset.id));
        }
    });

    const handleLocationInput = () => {
        const fromIn = getEl('from-center');
        const toIn = getEl('to-center');
        const typeIn = getEl('type');
        if(!fromIn || !toIn) return;
        const from = fromIn.value.trim();
        const to = toIn.value.trim();
        const type = typeIn.value;

        if((type === '화물운송' || type === '대기') && from && to) {
            const key = `${from}-${to}`;
            const incomeEl = getEl('income');
            if(incomeEl) incomeEl.value = Data.MEM_FARES[key] ? (Data.MEM_FARES[key]/10000).toFixed(2) : '';
            const distEl = getEl('manual-distance');
            if(distEl) distEl.value = Data.MEM_DISTANCES[key] || '';
            const costEl = getEl('cost');
            if(costEl) costEl.value = Data.MEM_COSTS[key] ? (Data.MEM_COSTS[key]/10000).toFixed(2) : '';
        }
        UI.updateAddressDisplay();
    };

    getEl('from-center')?.addEventListener('input', handleLocationInput);
    getEl('to-center')?.addEventListener('input', handleLocationInput);

    getEl('btn-register-trip')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
        Data.addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        Utils.showToast('등록되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('btn-start-trip')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData });
        Utils.showToast('운행 시작됨');
        UI.resetForm();
        getEl('today-date-picker').value = Utils.getStatisticalDate(Utils.getTodayString(), Utils.getCurrentTimeString());
        updateAllDisplays();
    });

    getEl('btn-end-trip')?.addEventListener('click', () => {
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
        Utils.showToast('운행 종료됨');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('btn-trip-cancel')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData, type: '운행취소' });
        Utils.showToast('취소 처리됨');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('btn-save-general')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.expenseItem) Data.updateExpenseItemData(formData.expenseItem);
        Data.addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        Utils.showToast('저장되었습니다.');
        UI.populateExpenseDatalist();
        UI.resetForm();
        updateAllDisplays();
        if(formData.type === '주유소') Stats.displaySubsidyRecords();
    });

    getEl('btn-update-record')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            const original = Data.MEM_RECORDS[index];
            const formData = UI.getFormDataWithoutTime();
            if (formData.type === '화물운송' && formData.from && formData.to) {
                const key = `${formData.from}-${formData.to}`;
                if(formData.distance > 0) Data.MEM_DISTANCES[key] = formData.distance;
                if(formData.income > 0) Data.MEM_FARES[key] = formData.income;
            }
            Data.MEM_RECORDS[index] = { ...original, ...formData, date: original.date, time: original.time };
            Data.saveData();
            Utils.showToast('수정 완료');
            UI.resetForm();
            updateAllDisplays();
        }
    });

    getEl('btn-delete-record')?.addEventListener('click', () => {
        if(confirm('정말 삭제하시겠습니까?')) {
            const id = parseInt(getEl('edit-id').value);
            Data.removeRecord(id);
            UI.resetForm();
            updateAllDisplays();
        }
    });

    getEl('btn-cancel-edit')?.addEventListener('click', UI.resetForm);

    getEl('btn-edit-start-trip')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            Data.MEM_RECORDS[index].date = Utils.getTodayString();
            Data.MEM_RECORDS[index].time = Utils.getCurrentTimeString();
            Data.saveData();
            UI.resetForm();
            updateAllDisplays();
        }
    });

    getEl('btn-edit-end-trip')?.addEventListener('click', () => {
        const nowDate = Utils.getTodayString();
        const nowTime = Utils.getCurrentTimeString();
        Data.addRecord({ id: Date.now(), date: nowDate, time: nowTime, type: '운행종료', distance: 0, cost: 0, income: 0 });
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('refresh-btn')?.addEventListener('click', () => { UI.resetForm(); location.reload(); });
    getEl('today-date-picker')?.addEventListener('change', () => updateAllDisplays());
    getEl('prev-day-btn')?.addEventListener('click', () => DateCtrl.moveDate(-1, updateAllDisplays));
    getEl('next-day-btn')?.addEventListener('click', () => DateCtrl.moveDate(1, updateAllDisplays));

    getEl('prev-daily-btn')?.addEventListener('click', () => DateCtrl.changeDateSelect('daily-year-select', 'daily-month-select', -1, updateAllDisplays));
    getEl('next-daily-btn')?.addEventListener('click', () => DateCtrl.changeDateSelect('daily-year-select', 'daily-month-select', 1, updateAllDisplays));
    getEl('prev-weekly-btn')?.addEventListener('click', () => DateCtrl.changeDateSelect('weekly-year-select', 'weekly-month-select', -1, updateAllDisplays));
    getEl('next-weekly-btn')?.addEventListener('click', () => DateCtrl.changeDateSelect('weekly-year-select', 'weekly-month-select', 1, updateAllDisplays));
    getEl('prev-monthly-btn')?.addEventListener('click', () => {
        const yEl = getEl('monthly-year-select');
        if(yEl) { yEl.value = parseInt(yEl.value) - 1; updateAllDisplays(); }
    });
    getEl('next-monthly-btn')?.addEventListener('click', () => {
        const yEl = getEl('monthly-year-select');
        if(yEl) { yEl.value = parseInt(yEl.value) + 1; updateAllDisplays(); }
    });
    ['daily-year-select', 'daily-month-select', 'weekly-year-select', 'weekly-month-select', 'monthly-year-select'].forEach(id => {
        getEl(id)?.addEventListener('change', updateAllDisplays);
    });

    getEl('go-to-settings-btn')?.addEventListener('click', () => { 
        const mainP = getEl('main-page'), setP = getEl('settings-page');
        if(mainP && setP) {
            mainP.classList.add("hidden"); setP.classList.remove("hidden"); 
            getEl('go-to-settings-btn').classList.add("hidden"); 
            getEl('back-to-main-btn').classList.remove("hidden"); 
            Stats.displayCumulativeData(); Stats.displayCurrentMonthData(); Stats.displaySubsidyRecords();
        }
    });

    getEl('back-to-main-btn')?.addEventListener('click', () => { 
        getEl('main-page')?.classList.remove("hidden"); getEl('settings-page')?.classList.add("hidden"); 
        getEl('go-to-settings-btn')?.classList.remove("hidden"); getEl('back-to-main-btn')?.classList.add("hidden"); 
        updateAllDisplays(); 
    });

    document.querySelectorAll('.collapsible-header').forEach(header => { 
        header.addEventListener("click", () => { 
            const body = header.nextElementSibling; 
            header.classList.toggle("active"); body.classList.toggle("hidden"); 
            if (header.id === 'toggle-subsidy-management' && !body.classList.contains('hidden')) Stats.displaySubsidyRecords(false); 
            if (header.id === 'toggle-center-management' && !body.classList.contains('hidden')) UI.displayCenterList();
        }); 
    });

    document.querySelectorAll('.tab-btn').forEach(btn => { 
        btn.addEventListener("click", event => { 
            if(btn.parentElement.classList.contains('view-tabs')) { 
                document.querySelectorAll('.tab-btn').forEach(b => { if(b.parentElement.classList.contains('view-tabs')) b.classList.remove("active"); }); 
                btn.classList.add("active"); 
                document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active')); 
                const view = getEl(btn.dataset.view + "-view");
                if(view) view.classList.add("active"); 
                updateAllDisplays(); 
            } 
        });
    });

    getEl('fuel-unit-price')?.addEventListener('input', () => { 
        const p=parseFloat(getEl('fuel-unit-price').value)||0, l=parseFloat(getEl('fuel-liters').value)||0; 
        if(p&&l) getEl('cost').value=(p*l/10000).toFixed(2); 
    });
    getEl('type')?.addEventListener('change', UI.toggleUI);
}