import { Process } from './process.js';
import { runScheduler } from './scheduler.js';

export class Simulator {
    constructor() {
        this.processes = [];
        this.algorithm = "FCFS"; // Default algorithm
        this.options = {
            timeQuantum: 2,
            lowNumberIsHighPriority: true
        };

        // Playback state
        this.currentTime = 0;
        this.isPlaying = false;
        this.speed = 1.0; // 1x, multipliers: 0.25, 0.5, 1.0, 2.0, 4.0
        this.timer = null;

        // Current scheduling run results
        this.gantt = [];
        this.history = [];
        this.scheduledProcesses = [];

        // Undo/Redo queues for process list editing
        this.undoStack = [];
        this.redoStack = [];

        // Callbacks to UI
        this.onStateChange = null; // Called when playback tick changes
        this.onDataChange = null;  // Called when processes are added/modified
        this.onPlaybackStatusChange = null; // Called on play/pause status updates
    }

    // --- Process List Management & Undo/Redo ---

    saveStateForUndo() {
        // Deep copy process list
        const snapshot = this.processes.map(p => p.clone());
        this.undoStack.push(snapshot);
        this.redoStack = []; // Clear redo on new action
        if (this.undoStack.length > 50) this.undoStack.shift(); // Limit stack size
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const currentSnapshot = this.processes.map(p => p.clone());
        this.redoStack.push(currentSnapshot);
        
        this.processes = this.undoStack.pop();
        this.triggerDataChange();
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        const nextSnapshot = this.redoStack.pop();
        this.undoStack.push(this.processes.map(p => p.clone()));

        this.processes = nextSnapshot;
        this.triggerDataChange();
        return true;
    }

    addProcess(id, arrivalTime, burstTime, priority = 0) {
        this.saveStateForUndo();
        // Ensure ID is unique
        let finalId = id.toString().trim();
        if (this.processes.some(p => p.id === finalId)) {
            let counter = 1;
            while (this.processes.some(p => p.id === `${finalId}_${counter}`)) {
                counter++;
            }
            finalId = `${finalId}_${counter}`;
        }
        const p = new Process(finalId, arrivalTime, burstTime, priority);
        this.processes.push(p);
        this.triggerDataChange();
        return p;
    }

    removeProcess(id) {
        this.saveStateForUndo();
        const initialLen = this.processes.length;
        this.processes = this.processes.filter(p => p.id !== id.toString());
        if (this.processes.length !== initialLen) {
            this.triggerDataChange();
            return true;
        }
        return false;
    }

    updateProcess(id, fields) {
        this.saveStateForUndo();
        const proc = this.processes.find(p => p.id === id.toString());
        if (proc) {
            if (fields.arrivalTime !== undefined) proc.arrivalTime = parseInt(fields.arrivalTime) || 0;
            if (fields.burstTime !== undefined) proc.burstTime = parseInt(fields.burstTime) || 0;
            if (fields.priority !== undefined) proc.priority = parseInt(fields.priority) || 0;
            this.triggerDataChange();
            return true;
        }
        return false;
    }

    clearProcesses() {
        this.saveStateForUndo();
        this.processes = [];
        this.triggerDataChange();
    }

    setProcesses(processList) {
        this.saveStateForUndo();
        this.processes = processList.map(p => new Process(p.id, p.arrivalTime, p.burstTime, p.priority));
        this.triggerDataChange();
    }

    // --- Simulation & Playback Engine ---

    setAlgorithm(algoKey, options = {}) {
        this.algorithm = algoKey;
        this.options = { ...this.options, ...options };
        this.runSimulation();
    }

    runSimulation() {
        if (this.processes.length === 0) {
            this.gantt = [];
            this.history = [];
            this.scheduledProcesses = [];
            this.currentTime = 0;
            this.triggerStateChange();
            return;
        }

        // Run scheduler
        const results = runScheduler(this.algorithm, this.processes, this.options);
        this.gantt = results.gantt;
        this.history = results.history;
        this.scheduledProcesses = results.processes;

        // Reset playback position if it exceeds new simulation length
        if (this.currentTime >= this.history.length) {
            this.currentTime = this.history.length - 1;
        }
        if (this.currentTime < 0) this.currentTime = 0;

        this.triggerStateChange();
    }

    triggerDataChange() {
        this.runSimulation();
        if (this.onDataChange) {
            this.onDataChange(this.processes);
        }
    }

    triggerStateChange() {
        if (this.onStateChange) {
            const snapshot = this.history[this.currentTime] || {
                time: this.currentTime,
                runningPid: "IDLE",
                readyQueue: [],
                upcomingPids: [],
                completedPids: [],
                contextSwitches: 0
            };
            this.onStateChange(this.currentTime, snapshot, this.gantt, this.scheduledProcesses);
        }
    }

    // --- Playback Controls ---

    play() {
        if (this.isPlaying) return;
        if (this.history.length === 0) return;

        // If at the end, restart from beginning
        if (this.currentTime >= this.history.length - 1) {
            this.currentTime = 0;
        }

        this.isPlaying = true;
        if (this.onPlaybackStatusChange) this.onPlaybackStatusChange(true);

        const tickDuration = 1000 / this.speed;
        
        const runTick = () => {
            if (!this.isPlaying) return;
            
            if (this.currentTime < this.history.length - 1) {
                this.currentTime++;
                this.triggerStateChange();
                // Schedule next tick
                this.timer = setTimeout(runTick, 1000 / this.speed);
            } else {
                this.pause();
            }
        };

        this.timer = setTimeout(runTick, tickDuration);
    }

    pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.onPlaybackStatusChange) this.onPlaybackStatusChange(false);
    }

    setSpeed(speedVal) {
        this.speed = parseFloat(speedVal) || 1.0;
        if (this.isPlaying) {
            // Re-apply timeout duration dynamically
            this.pause();
            this.play();
        }
    }

    stepForward() {
        this.pause();
        if (this.currentTime < this.history.length - 1) {
            this.currentTime++;
            this.triggerStateChange();
        }
    }

    stepBackward() {
        this.pause();
        if (this.currentTime > 0) {
            this.currentTime--;
            this.triggerStateChange();
        }
    }

    seekTo(timeTick) {
        this.pause();
        const target = Math.max(0, Math.min(parseInt(timeTick) || 0, this.history.length - 1));
        this.currentTime = target;
        this.triggerStateChange();
    }

    restart() {
        this.pause();
        this.currentTime = 0;
        this.triggerStateChange();
    }
}
