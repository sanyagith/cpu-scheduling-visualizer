import { getPastelColorForPid } from './animation.js';

/**
 * Renders the Gantt Chart onto a Canvas element.
 * 
 * @param {HTMLElement|string} container - Div container to hold the Gantt chart
 * @param {Array} gantt - Gantt chart execution blocks
 * @param {number} currentTime - Current playback time tick
 * @param {number} totalDuration - Total simulation duration
 */
export function renderGanttChart(container, gantt, currentTime, totalDuration) {
    const wrapper = typeof container === 'string' ? document.getElementById(container) : container;
    if (!wrapper) return;

    // Clear previous wrapper children
    wrapper.innerHTML = "";

    if (!gantt || gantt.length === 0 || totalDuration === 0) {
        wrapper.innerHTML = `<div style="color: var(--text-muted); text-align: center; font-style: italic; font-size: 0.9rem; padding: 12px 0;">No Gantt data available</div>`;
        return;
    }

    // Create Canvas dynamically to support high-DPI scaling
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "75px";
    canvas.className = "gantt-canvas";
    wrapper.appendChild(canvas);

    // Adjust canvas resolution for sharp drawing
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 800;
    const height = 75;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // Layout variables
    const chartX = 10;
    const chartY = 10;
    const chartWidth = width - 20;
    const chartHeight = 40;
    const scaleY = chartY + chartHeight + 15;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate scale factor: pixels per time unit
    const pixelsPerUnit = chartWidth / totalDuration;

    // Draw Gantt blocks
    gantt.forEach(block => {
        const startX = chartX + block.start * pixelsPerUnit;
        const blockW = (block.end - block.start) * pixelsPerUnit;
        
        ctx.save();
        
        // Determine fill style (color by PID)
        let fillStyle = "#1e293b"; // Default dark
        if (block.pid !== "IDLE") {
            fillStyle = getPastelColorForPid(block.pid);
        } else {
            fillStyle = "rgba(148, 163, 184, 0.15)";
        }

        ctx.fillStyle = fillStyle;

        // Apply a faded state for future execution blocks relative to scrubber currentTime
        if (block.start >= currentTime) {
            // Future block (fully faded)
            ctx.globalAlpha = 0.25;
        } else if (currentTime > block.start && currentTime < block.end) {
            // Partially completed block (clip or split alpha)
            // We can draw two rectangles for a neat visual effect:
            // One completed (full alpha) and one future (faded alpha)
            const completedW = (currentTime - block.start) * pixelsPerUnit;
            const remainingW = blockW - completedW;

            // Draw completed portion
            ctx.fillRect(startX, chartY, completedW, chartHeight);
            
            // Draw remaining faded portion
            ctx.fillStyle = fillStyle;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(startX + completedW, chartY, remainingW, chartHeight);
            
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = 1.0;
        } else {
            // Past completed block (full opacity)
            ctx.globalAlpha = 1.0;
        }

        if (currentTime > block.start && currentTime < block.end) {
            // Split block drawn already, just draw the borders
        } else {
            ctx.fillRect(startX, chartY, blockW, chartHeight);
        }

        // Draw block border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, chartY, blockW, chartHeight);

        // Draw block label (process ID)
        if (blockW > 15) { // Only draw text if block is wide enough
            ctx.fillStyle = block.pid === "IDLE" ? "rgba(255,255,255,0.4)" : "#ffffff";
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(block.pid, startX + blockW / 2, chartY + chartHeight / 2);
        }
        
        ctx.restore();
    });

    // Draw Scale Ticks (Timeline numbers)
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";

    // Determine step size for ticks based on total duration to avoid overcrowding
    let stepSize = 1;
    if (totalDuration > 50) stepSize = 10;
    else if (totalDuration > 20) stepSize = 5;
    else if (totalDuration > 10) stepSize = 2;

    for (let t = 0; t <= totalDuration; t += stepSize) {
        const xVal = chartX + t * pixelsPerUnit;
        ctx.fillText(t.toString(), xVal, scaleY);
        // Little tick mark
        ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
        ctx.beginPath();
        ctx.moveTo(xVal, chartY + chartHeight);
        ctx.lineTo(xVal, chartY + chartHeight + 4);
        ctx.stroke();
    }

    // Draw Current Playhead Cursor
    const playheadX = chartX + currentTime * pixelsPerUnit;
    ctx.save();
    ctx.strokeStyle = "#ef4444"; // Red playhead
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(239, 68, 68, 0.5)";
    ctx.shadowBlur = 4;
    
    ctx.beginPath();
    ctx.moveTo(playheadX, chartY - 2);
    ctx.lineTo(playheadX, chartY + chartHeight + 8);
    ctx.stroke();

    // Small triangle on top of playhead
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(playheadX - 4, chartY - 2);
    ctx.lineTo(playheadX + 4, chartY - 2);
    ctx.lineTo(playheadX, chartY + 3);
    ctx.fill();

    ctx.restore();
}

/**
 * Downloads the current Gantt chart canvas as a PNG image.
 */
export function exportGanttAsPNG(container) {
    const wrapper = typeof container === 'string' ? document.getElementById(container) : container;
    if (!wrapper) return;

    const canvas = wrapper.querySelector("canvas");
    if (!canvas) return;

    // Trigger download
    const link = document.createElement("a");
    link.download = `gantt_chart_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}
