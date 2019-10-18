/*
 * MIT License
 *
 * Copyright (c) 2018 Markus Graube <markus.graube@tu.dresden.de>,
 * Chair for Process Control Systems, Technische Universität Dresden
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {ControlEnableInterface, OpModeInterface} from '@p2olab/polaris-interface';

export enum ServiceState {
    UNDEFINED = 1,
    STOPPED = 4,
    STARTING = 8,
    IDLE = 16,
    PAUSED = 32,
    EXECUTE = 64,
    STOPPING = 128,
    ABORTING = 256,
    ABORTED = 512,
    HOLDING = 1024,
    HELD = 2048,
    UNHOLDING = 4096,
    PAUSING = 8192,
    RESUMING = 16384,
    RESETTING = 32768,
    COMPLETING = 65536,
    COMPLETED = 131072
}

export enum ServiceControlEnable {
    UNDEFINED = 0,
    RESET = 2,
    START = 4,
    STOP = 8,
    UNHOLD = 32,
    PAUSE = 64,
    RESUME = 128,
    ABORT = 256,
    RESTART = 512,
    COMPLETE = 1024
}

export function controlEnableToJson(controlEnable: ServiceControlEnable): ControlEnableInterface {
    return {
        start: (controlEnable & ServiceControlEnable.START) !== 0,
        restart: (controlEnable & ServiceControlEnable.RESTART) !== 0,
        pause: (controlEnable & ServiceControlEnable.PAUSE) !== 0,
        resume: (controlEnable & ServiceControlEnable.RESUME) !== 0,
        complete: (controlEnable & ServiceControlEnable.COMPLETE) !== 0,
        unhold: (controlEnable & ServiceControlEnable.UNHOLD) !== 0,
        stop: (controlEnable & ServiceControlEnable.STOP) !== 0,
        abort: (controlEnable & ServiceControlEnable.ABORT) !== 0,
        reset: (controlEnable & ServiceControlEnable.RESET) !== 0
    };
}

export enum ServiceMtpCommand {
    UNDEFINED = 0,
    RESET = 2,
    START = 4,
    STOP = 8,
    UNHOLD = 32,
    PAUSE = 64,
    RESUME = 128,
    ABORT = 256,
    RESTART = 512,
    COMPLETE = 1024
}

export enum OperationMode {
    Offline,
    Operator,
    Automatic
}

export enum SourceMode {
    Manual,
    Intern
}

export function opModetoJson(opMode: OperationMode): OpModeInterface {
    let state;
    if (isManualState(opMode)) {
        state = 'operator';
    } else if (isAutomaticState(opMode)) {
        state = 'automatic';
    } else if (isOffState(opMode)) {
        state = 'offline';
    }
    return {state: state, source: undefined};
}

export function isOffState(opMode: OperationMode): boolean {
    return (opMode === OperationMode.Offline);
}

export function isAutomaticState(opMode: OperationMode): boolean {
    return (opMode === OperationMode.Automatic);
}

export function isManualState(opMode: OperationMode): boolean {
    return (opMode === OperationMode.Operator);
}

export function isExtSource(sourceMode: SourceMode): boolean {
    return (sourceMode === SourceMode.Manual);
}

export function isIntSource(sourceMode: SourceMode): boolean {
    return (sourceMode === SourceMode.Intern);
}
