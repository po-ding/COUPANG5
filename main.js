/** 
 * main.js 
 * 애플리케이션의 중심 컨트롤러 및 초기화 로직
 */
import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';

// 분리된 이벤트 및 초기화 모듈 임포트
import { setupEventListeners } from './events.js';
import { initPrintAndDataFeatures } from './print_data_init.js';
import { registerParsedTripWithInfo } from './sms_parser.js';

/**
 * 모든 화면의 데이터를 최신화하는 중앙 함수
 */
function updateAllDisplays() {
    const picker = document.getElementById('today-date-picker');
    if (!picker) return;
    
    const targetDate = picker.value;
    
    // 각 섹션별 데이터 렌더링
    Stats.displayTodayRecords(targetDate); // 오늘 기록 테이블
    Stats.displayDailyRecords();           // 일별 요약
    Stats.displayWeeklyRecords();          // 주별 요약
    Stats.displayMonthlyRecords();         // 월별 요약
    UI.renderFrequentLocationButtons();    // 자주 가는 지역 버튼 갱신
}

/**
 * 앱 시작 시 실행되는 초기 설정 함수
 */
function initialSetup() {
    // 1. 데이터 로드 (localStorage -> Memory)
    Data.loadAllData();
    
    // 2. UI 요소 초기화 (데이터리스트 등)
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist();
    
    // 3. 날짜 및 시간 초기 기본값 설정
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    
    if (document.getElementById('date')) document.getElementById('date').value = todayStr;
    if (document.getElementById('time')) document.getElementById('time').value = nowTime;
    if (document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = todayStr;

    // 4. 조회 셀렉트 박스(연도/월) 옵션 생성
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let i = 0; i < 5; i++) {
        yearOptions.push(`<option value="${currentYear - i}">${currentYear - i}년</option>`);
    }
    
    const yearSelectIds = ['daily-year-select', 'weekly-year-select', 'monthly-year-select', 'print-year-select'];
    yearSelectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = yearOptions.join('');
    });

    const monthOptions = [];
    for (let i = 1; i <= 12; i++) {
        monthOptions.push(`<option value="${i.toString().padStart(2, '0')}">${i}월</option>`);
    }
    
    const monthSelectIds = ['daily-month-select', 'weekly-month-select', 'print-month-select'];
    monthSelectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = monthOptions.join('');
            el.value = (new Date().getMonth() + 1).toString().padStart(2, '0');
        }
    });

    // 5. 전역 함수 연결 (HTML 인라인 이벤트 및 다른 모듈 호출용)
    window.updateAllDisplays = updateAllDisplays;
    window.registerParsedTripWithInfo = registerParsedTripWithInfo; // 최신 SMS 등록 함수
    
    // 특정 날짜 상세 보기 (일별 테이블에서 호출)
    window.viewDateDetails = (date) => {
        const picker = document.getElementById('today-date-picker');
        if (picker) {
            picker.value = date;
            // '오늘' 탭으로 자동 이동
            document.querySelector('.tab-btn[data-view="today"]')?.click();
            updateAllDisplays();
        }
    };

    // 요약 카드 클릭 시 값 숨김/보임 토글
    window.toggleAllSummaryValues = (container) => {
        container.classList.toggle('active');
        container.querySelectorAll('.summary-value').forEach(el => el.classList.toggle('hidden'));
    };

    // 6. 설정 페이지인 경우 추가 렌더링
    if (window.location.pathname.includes('settings.html')) {
        Stats.displayCumulativeData(); 
        Stats.displayCurrentMonthData();
        UI.displayCenterList();
    }

    // 7. 이벤트 리스너 등록 (분리된 모듈 호출)
    setupEventListeners(updateAllDisplays);
    
    // 8. 인쇄 및 데이터 관리 기능 초기화
    initPrintAndDataFeatures();

    // 9. 초기 화면 렌더링 및 폼 리셋
    updateAllDisplays();
    UI.resetForm();
}

// DOM 로드 완료 시 앱 시작
document.addEventListener("DOMContentLoaded", initialSetup);