import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';
import * as DateCtrl from './date_controls.js';
import { parseSmsText } from './sms_parser.js';

export function setupEventListeners(updateAllDisplays) {
    const getEl = (id) => document.getElementById(id);

    // [중요] 아코디언 클릭 핸들러
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
        const from = getEl('from-center').value.trim();
        const to = getEl('to-center').value.trim();
        const type = getEl('type').value;
        if((type === '화물운송' || type === '대기') && from && to) {
            const key = `${from}-${to}`;
            if(getEl('income')) getEl('income').value = Data.MEM_FARES[key] ? (Data.MEM_FARES[key]/10000).toFixed(2) : '';
            if(getEl('manual-distance')) getEl('manual-distance').value = Data.MEM_DISTANCES[key] || '';
            if(getEl('cost')) getEl('cost').value = Data.MEM_COSTS[key] ? (Data.MEM_COSTS[key]/10000).toFixed(2) : '';
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
        Data.addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        Utils.showToast('저장되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('btn-update-record')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            const formData = UI.getFormDataWithoutTime();
            Data.MEM_RECORDS[index] = { ...Data.MEM_RECORDS[index], ...formData };
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

    getEl('refresh-btn')?.addEventListener('click', () => { UI.resetForm(); location.reload(); });
    getEl('today-date-picker')?.addEventListener('change', () => updateAllDisplays());
    getEl('prev-day-btn')?.addEventListener('click', () => DateCtrl.moveDate(-1, updateAllDisplays));
    getEl('next-day-btn')?.addEventListener('click', () => DateCtrl.moveDate(1, updateAllDisplays));

    getEl('go-to-settings-btn')?.addEventListener('click', () => {
        getEl('main-page').classList.add('hidden');
        getEl('settings-page').classList.remove('hidden');
        getEl('go-to-settings-btn').classList.add('hidden');
        getEl('back-to-main-btn').classList.remove('hidden');
    });

    getEl('back-to-main-btn')?.addEventListener('click', () => {
        getEl('main-page').classList.remove('hidden');
        getEl('settings-page').classList.add('hidden');
        getEl('go-to-settings-btn').classList.remove('hidden');
        getEl('back-to-main-btn').classList.add('hidden');
        updateAllDisplays();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active'));
            getEl(btn.dataset.view + '-view').classList.add('active');
            updateAllDisplays();
        });
    });

    getEl('fuel-unit-price')?.addEventListener('input', () => { 
        const p=parseFloat(getEl('fuel-unit-price').value)||0, l=parseFloat(getEl('fuel-liters').value)||0; 
        if(p&&l) getEl('cost').value=(p*l/10000).toFixed(2); 
    });
    getEl('type')?.addEventListener('change', UI.toggleUI);
}