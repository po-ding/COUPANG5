/** main.js */
import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';
import { setupEventListeners } from './events.js';
import { initPrintAndDataFeatures } from './print_data_init.js';
import { registerParsedTrip } from './sms_parser.js';

function updateAllDisplays() {
    const picker = document.getElementById('today-date-picker');
    if(!picker) return;
    const targetDate = picker.value;
    Stats.displayTodayRecords(targetDate);
    Stats.displayDailyRecords();
    Stats.displayWeeklyRecords();
    Stats.displayMonthlyRecords();
    UI.renderFrequentLocationButtons(); 
}

function initialSetup() {
    Data.loadAllData();
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist();
    
    // 초기 날짜 세팅
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    if(document.getElementById('date')) document.getElementById('date').value = todayStr;
    if(document.getElementById('time')) document.getElementById('time').value = nowTime;
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = todayStr;

    // 셀렉트 박스 연도/월 채우기
    const y = new Date().getFullYear();
    const yrs = []; for(let i=0; i<5; i++) yrs.push(`<option value="${y-i}">${y-i}년</option>`);
    ['daily-year-select', 'weekly-year-select', 'monthly-year-select', 'print-year-select'].forEach(id => {
        const el = document.getElementById(id); if(el) el.innerHTML = yrs.join('');
    });
    const ms = []; for(let i=1; i<=12; i++) ms.push(`<option value="${i.toString().padStart(2,'0')}">${i}월</option>`);
    ['daily-month-select', 'weekly-month-select', 'print-month-select'].forEach(id => {
        const el = document.getElementById(id); if(el) { el.innerHTML = ms.join(''); el.value = (new Date().getMonth()+1).toString().padStart(2,'0'); }
    });

    // 글로벌 함수 연결 (HTML inline 용)
    window.registerParsedTrip = registerParsedTrip;
    window.updateAllDisplays = updateAllDisplays;
    window.viewDateDetails = (date) => {
        const picker = document.getElementById('today-date-picker');
        if(picker) {
            picker.value = date;
            document.querySelector('.tab-btn[data-view="today"]')?.click();
            updateAllDisplays();
        }
    };
    window.toggleAllSummaryValues = (container) => {
        container.classList.toggle('active');
        container.querySelectorAll('.summary-value').forEach(el => el.classList.toggle('hidden'));
    };

    if(window.location.pathname.includes('settings.html')) {
        Stats.displayCumulativeData(); 
        Stats.displayCurrentMonthData();
        UI.displayCenterList();
    }

    setupEventListeners(updateAllDisplays);
    initPrintAndDataFeatures();
    updateAllDisplays();
    UI.resetForm();
}

document.addEventListener("DOMContentLoaded", initialSetup);