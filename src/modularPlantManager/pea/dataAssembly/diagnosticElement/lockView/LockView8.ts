/* tslint:disable:max-classes-per-file */
/*
 * MIT License
 *
 * Copyright (c) 2021 P2O-Lab <p2o-lab@mailbox.tu-dresden.de>,
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

import {DataAssemblyOptions} from '@p2olab/polaris-interface';
import {OpcUaConnection, OpcUaDataItem} from '../../../connection';
import {LockView4, LockView4Runtime} from './LockView4';

export type LockView8Runtime = LockView4Runtime & {
	In5En: OpcUaDataItem<boolean>;
	In5: OpcUaDataItem<boolean>;
	In5QC: OpcUaDataItem<number>;
	In5Inv: OpcUaDataItem<boolean>;
	In5Txt: OpcUaDataItem<string>;

	In6En: OpcUaDataItem<boolean>;
	In6: OpcUaDataItem<boolean>;
	In6QC: OpcUaDataItem<number>;
	In6Inv: OpcUaDataItem<boolean>;
	In6Txt: OpcUaDataItem<string>;

	In7En: OpcUaDataItem<boolean>;
	In7: OpcUaDataItem<boolean>;
	In7QC: OpcUaDataItem<number>;
	In7Inv: OpcUaDataItem<boolean>;
	In7Txt: OpcUaDataItem<string>;

	In8En: OpcUaDataItem<boolean>;
	In8: OpcUaDataItem<boolean>;
	In8QC: OpcUaDataItem<number>;
	In8Inv: OpcUaDataItem<boolean>;
	In8Txt: OpcUaDataItem<string>;
};

export class LockView8 extends LockView4 {
	public readonly communication!: LockView8Runtime;

	constructor(options: DataAssemblyOptions, connection: OpcUaConnection) {
		super(options, connection);

		this.communication.In5En = this.createDataItem('In5En', 'read', 'boolean');
		this.communication.In5 = this.createDataItem('In5', 'read', 'boolean');
		this.communication.In5QC = this.createDataItem('In5QC', 'read', 'number');
		this.communication.In5Inv = this.createDataItem('In5Inv', 'read', 'boolean');
		this.communication.In5Txt = this.createDataItem('In5Txt', 'read', 'string');

		this.communication.In6En = this.createDataItem('In6En', 'read', 'boolean');
		this.communication.In6 = this.createDataItem('In6', 'read', 'boolean');
		this.communication.In6QC = this.createDataItem('In6QC', 'read', 'number');
		this.communication.In6Inv = this.createDataItem('In6Inv', 'read', 'boolean');
		this.communication.In6Txt = this.createDataItem('In6Txt', 'read', 'string');

		this.communication.In7En = this.createDataItem('In7En', 'read', 'boolean');
		this.communication.In7 = this.createDataItem('In7', 'read', 'boolean');
		this.communication.In7QC = this.createDataItem('In7QC', 'read', 'number');
		this.communication.In7Inv = this.createDataItem('In7Inv', 'read', 'boolean');
		this.communication.In7Txt = this.createDataItem('In7Txt', 'read', 'string');

		this.communication.In8En = this.createDataItem('In8En', 'read', 'boolean');
		this.communication.In8 = this.createDataItem('In8', 'read', 'boolean');
		this.communication.In8QC = this.createDataItem('In8QC', 'read', 'number');
		this.communication.In8Inv = this.createDataItem('In8Inv', 'read', 'boolean');
		this.communication.In8Txt = this.createDataItem('In8Txt', 'read', 'string');
	}

}