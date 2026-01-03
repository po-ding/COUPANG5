/** date_controls.js */
export function moveDate(offset, updateCallback) {
    const picker = document.getElementById('today-date-picker');
    if (!picker || !picker.value) return;
    const parts = picker.value.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() + offset);
    picker.value = dateObj.toISOString().slice(0, 10);
    if(updateCallback) updateCallback();
}

export function changeDateSelect(yId, mId, delta, updateCallback) {
    const yEl = document.getElementById(yId);
    const mEl = document.getElementById(mId);
    if(!yEl || !mEl) return;
    const d = new Date(parseInt(yEl.value), parseInt(mEl.value) - 1 + delta, 1);
    yEl.value = d.getFullYear();
    mEl.value = String(d.getMonth() + 1).padStart(2, '0');
    if(updateCallback) updateCallback();
}