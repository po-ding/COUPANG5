/** print_data_init.js */
import * as Utils from './utils.js';
import * as Data from './data.js';
import * as Stats from './stats.js';

export function initPrintAndDataFeatures() {
    const getPrintEls = () => ({ 
        y: document.getElementById('print-year-select')?.value, 
        m: document.getElementById('print-month-select')?.value 
    });

    const printActions = [
        { id: 'print-first-half-btn', p: 'first', d: false },
        { id: 'print-second-half-btn', p: 'second', d: false },
        { id: 'print-full-month-btn', p: 'full', d: false },
        { id: 'print-first-half-detail-btn', p: 'first', d: true },
        { id: 'print-second-half-detail-btn', p: 'second', d: true },
        { id: 'print-full-month-detail-btn', p: 'full', d: true }
    ];

    printActions.forEach(act => {
        document.getElementById(act.id)?.addEventListener('click', () => {
            const config = getPrintEls();
            Stats.generatePrintView(config.y, config.m, act.p, act.d);
        });
    });

    document.getElementById('export-json-btn')?.addEventListener('click', () => { 
        const data = { 
            records: Data.MEM_RECORDS, 
            centers: Data.MEM_CENTERS, 
            locations: Data.MEM_LOCATIONS, 
            fares: Data.MEM_FARES, 
            distances: Data.MEM_DISTANCES, 
            costs: Data.MEM_COSTS, 
            subsidy: localStorage.getItem('fuel_subsidy_limit'), 
            correction: localStorage.getItem('mileage_correction'), 
            expenseItems: Data.MEM_EXPENSE_ITEMS 
        }; 
        const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(b); 
        a.download=`backup_${Utils.getTodayString()}.json`; 
        a.click(); 
    });

    document.getElementById('import-json-btn')?.addEventListener('click', () => {
        document.getElementById('import-file-input')?.click();
    });

    document.getElementById('import-file-input')?.addEventListener('change', (e) => { 
        if(!confirm('복원하시겠습니까?')) return; 
        const r = new FileReader(); 
        r.onload = (evt) => { 
            try {
                const d = JSON.parse(evt.target.result); 
                if(d.records) localStorage.setItem('records', JSON.stringify(d.records)); 
                if(d.centers) localStorage.setItem('logistics_centers', JSON.stringify(d.centers)); 
                if(d.locations) localStorage.setItem('saved_locations', JSON.stringify(d.locations)); 
                if(d.fares) localStorage.setItem('saved_fares', JSON.stringify(d.fares));
                alert('복원완료'); location.reload(); 
            } catch(err) {
                alert('파일 형식이 잘못되었습니다.');
            }
        }; 
        r.readAsText(e.target.files[0]); 
    });

    document.getElementById('clear-btn')?.addEventListener('click', () => { 
        if(confirm('전체데이터를 삭제하시겠습니까?')) { 
            localStorage.clear(); 
            location.reload(); 
        }
    });
}