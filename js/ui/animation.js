/**
 * Handles rendering the interactive pipeline visualization:
 * Ready Queue → CPU Running → Completed Processes, along with Future Upcoming Processes.
 */

// Simple hashing function to generate distinct, consistent pastel colors for process IDs
export function getPastelColorForPid(pid) {
    let hash = 0;
    for (let i = 0; i < pid.length; i++) {
        hash = pid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    // HSL: saturated, bright pastel colors
    return `hsl(${hue}, 70%, 45%)`;
}

/**
 * Renders the state of the system at time t.
 * 
 * @param {Object} snapshot - The history tick snapshot
 * @param {Array<Process>} scheduledProcesses - Scheduled processes with results
 */
export function updatePipelineVisualization(snapshot, scheduledProcesses) {
    const readyLane = document.getElementById("lane-ready");
    const cpuLane = document.getElementById("lane-cpu");
    const completedLane = document.getElementById("lane-completed");
    const upcomingLane = document.getElementById("lane-upcoming");

    if (!readyLane || !cpuLane || !completedLane || !upcomingLane) return;

    // Map scheduled processes for quick lookup
    const processMap = {};
    scheduledProcesses.forEach(p => {
        processMap[p.id] = p;
    });

    // 1. Render Ready Queue
    if (snapshot.readyQueue.length === 0) {
        readyLane.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; width: 100%; text-align: center;">Ready queue is empty</div>`;
    } else {
        readyLane.innerHTML = snapshot.readyQueue.map(pInfo => {
            const color = getPastelColorForPid(pInfo.id);
            // If responseRatio is available (HRRN), show it!
            const ratioBadge = pInfo.responseRatio ? `<span class="p-detail" style="color: var(--yellow-color); font-weight: 600;">(RR: ${pInfo.responseRatio})</span>` : "";
            return `
                <div class="process-block" style="border-top: 3px solid ${color};">
                    <span class="p-id">${pInfo.id}</span>
                    <span class="p-detail">Rem: ${pInfo.remainingTime}s</span>
                    ${ratioBadge}
                </div>
            `;
        }).join("");
    }

    // 2. Render CPU Execution Node
    if (snapshot.runningPid === "IDLE" || !snapshot.runningPid) {
        cpuLane.innerHTML = `
            <div class="process-block idle" style="min-width: 100px; height: 80px; display: flex; flex-direction: column;">
                <span class="p-id">IDLE</span>
                <span class="p-detail">CPU Sleeping</span>
            </div>
        `;
    } else {
        const activePid = snapshot.runningPid;
        const origProcess = processMap[activePid];
        
        // Find remaining time at this tick
        let remTime = 0;
        let priorityVal = 0;
        const currentReadyState = snapshot.readyQueue.find(p => p.id === activePid);
        if (currentReadyState) {
            remTime = currentReadyState.remainingTime;
            priorityVal = currentReadyState.priority;
        } else {
            // It might not be in the ready queue snapshot since it's active. Let's trace it.
            // If it's the running process, we can check its remaining time at time t.
            // Let's compute remaining time:
            // Find how much this process has executed up to time t.
            // We can look at the original process remainingTime or compute it:
            // Since we clone processes for each simulation step, we can find the progress.
            // But let's check: our history snapshots store readyQueue with remaining times.
            // Let's make sure we find the running process's remaining time.
            // Actually, in our algorithms, when recording history, the running process has remainingTime decremented *after* the history is recorded.
            // So at start of tick t, the remainingTime of running process is its state. Let's find it.
            const scheduledProc = processMap[activePid];
            if (scheduledProc) {
                // If scheduler ran it, we can calculate how many ticks it has run by time t.
                // Or we can just calculate it in the algorithm and store it.
                // Wait! In our algorithms, we record the history tick *before* executing the tick.
                // So the process is running. What is its remaining time?
                // Let's check: our algorithm does:
                // `currentProcess.remainingTime` is still current.
                // Let's add remainingTime of current process directly into history snapshots!
                // Yes, wait! In our algorithms, did we write history runningPid remainingTime?
                // Let's check: in fcfs.js, sjf.js, srtf.js, priority.js, roundRobin.js, hrrn.js,
                // we wrote history snapshot with: `runningPid: currentProcess.id` but we didn't store its remaining time directly in the snapshot object.
                // Wait! Can we get its remaining time?
                // Yes, if we have the Gantt chart, we can count the total execution ticks of this process up to time t!
                // Let's see: `executionTicksBeforeT = sum of (end - start) for blocks of this pid before t, plus (t - start) for current block if active`.
                // Then `remainingTime = burstTime - executionTicksBeforeT`.
                // This is a completely robust way to calculate it dynamically!
                // Let's write a small helper to get remaining time of a process at tick t.
                remTime = getRemainingTimeAtTick(activePid, snapshot.time, scheduledProcesses, readyLane.dataset.gantt ? JSON.parse(readyLane.dataset.gantt) : []);
                priorityVal = origProcess ? origProcess.priority : 0;
            }
        }

        const color = getPastelColorForPid(activePid);
        const burstTime = origProcess ? origProcess.burstTime : 1;
        const progressPct = ((burstTime - remTime) / burstTime) * 100;

        cpuLane.innerHTML = `
            <div class="process-block running" style="background: linear-gradient(135deg, ${color}, var(--bg-color)); border-color: ${color}; position: relative; width: 140px; height: 90px; justify-content: space-between; padding: 8px;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <span class="p-id" style="font-size: 1.15rem;">${activePid}</span>
                    <span style="font-size: 0.7rem; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">Prio: ${priorityVal}</span>
                </div>
                <div style="font-size: 0.75rem; width: 100%; text-align: left; margin-bottom: 2px;">
                    Executing... <span style="float: right; font-weight: 600;">${remTime}s remaining</span>
                </div>
                <div style="width: 100%; background: rgba(255,255,255,0.15); height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${progressPct}%; background: var(--green-color); height: 100%; transition: width 0.2s ease;"></div>
                </div>
            </div>
        `;
    }

    // 3. Render Completed Processes
    if (snapshot.completedPids.length === 0) {
        completedLane.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; width: 100%; text-align: center;">No completed processes yet</div>`;
    } else {
        completedLane.innerHTML = snapshot.completedPids.map(pid => {
            const color = getPastelColorForPid(pid);
            const proc = processMap[pid];
            const waitText = proc ? `Wait: ${proc.waitingTime}s` : "";
            return `
                <div class="process-block" style="border-top: 3px solid var(--green-color); background: rgba(34, 197, 94, 0.05);">
                    <span class="p-id" style="color: var(--green-color);">${pid}</span>
                    <span class="p-detail" style="font-size: 0.65rem;">${waitText}</span>
                </div>
            `;
        }).join("");
    }

    // 4. Render Upcoming (Not arrived yet) Processes
    if (snapshot.upcomingPids.length === 0) {
        upcomingLane.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; width: 100%; text-align: center;">All processes have arrived</div>`;
    } else {
        upcomingLane.innerHTML = snapshot.upcomingPids.map(pid => {
            const color = getPastelColorForPid(pid);
            const proc = processMap[pid];
            const arrTime = proc ? proc.arrivalTime : 0;
            return `
                <div class="process-block" style="border-top: 3px solid var(--text-muted); opacity: 0.6;">
                    <span class="p-id">${pid}</span>
                    <span class="p-detail">Arrives at: ${arrTime}s</span>
                </div>
            `;
        }).join("");
    }
}

/**
 * Dynamic helper to compute a process's remaining time at a given simulation tick.
 */
function getRemainingTimeAtTick(pid, time, scheduledProcesses, gantt) {
    const proc = scheduledProcesses.find(p => p.id === pid);
    if (!proc) return 0;
    
    let executedTicks = 0;
    gantt.forEach(block => {
        if (block.pid === pid) {
            if (time >= block.end) {
                executedTicks += (block.end - block.start);
            } else if (time > block.start && time < block.end) {
                executedTicks += (time - block.start);
            }
        }
    });

    return Math.max(0, proc.burstTime - executedTicks);
}

/**
 * Cache Gantt chart on ready lane dataset for the remaining time calculation.
 */
export function cacheGanttForAnimation(gantt) {
    const readyLane = document.getElementById("lane-ready");
    if (readyLane) {
        readyLane.dataset.gantt = JSON.stringify(gantt);
    }
}
