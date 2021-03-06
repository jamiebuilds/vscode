/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {TPromise} from 'vs/base/common/winjs.base';
import {IThreadService} from 'vs/workbench/services/thread/common/threadService';
import {IQuickOpenService, IPickOptions, IInputOptions} from 'vs/workbench/services/quickopen/common/quickOpenService';
import {InputBoxOptions} from 'vscode';
import {ExtHostContext, MainThreadQuickOpenShape, ExtHostQuickOpenShape, MyQuickPickItems} from './extHost.protocol';

export class MainThreadQuickOpen extends MainThreadQuickOpenShape {

	private _proxy: ExtHostQuickOpenShape;
	private _quickOpenService: IQuickOpenService;
	private _doSetItems: (items: MyQuickPickItems[]) => any;
	private _doSetError: (error: Error) => any;
	private _contents: TPromise<MyQuickPickItems[]>;
	private _token: number = 0;

	constructor(
		@IThreadService threadService: IThreadService,
		@IQuickOpenService quickOpenService: IQuickOpenService
	) {
		super();
		this._proxy = threadService.get(ExtHostContext.ExtHostQuickOpen);
		this._quickOpenService = quickOpenService;
	}

	$show(options: IPickOptions): Thenable<number> {

		const myToken = ++this._token;

		this._contents = new TPromise((c, e) => {
			this._doSetItems = (items) => {
				if (myToken === this._token) {
					c(items);
				}
			};

			this._doSetError = (error) => {
				if (myToken === this._token) {
					e(error);
				}
			};
		});

		return this._quickOpenService.pick(this._contents, options).then(item => {
			if (item) {
				return item.handle;
			}
		}, undefined, progress => {
			if (progress) {
				this._proxy.$onItemSelected((<MyQuickPickItems>progress).handle);
			}
		});
	}

	$setItems(items: MyQuickPickItems[]): Thenable<any> {
		if (this._doSetItems) {
			this._doSetItems(items);
			return;
		}
	}

	$setError(error: Error): Thenable<any> {
		if (this._doSetError) {
			this._doSetError(error);
			return;
		}
	}

	// ---- input

	$input(options: InputBoxOptions, validateInput: boolean): Thenable<string> {

		const inputOptions: IInputOptions = Object.create(null);

		if (options) {
			inputOptions.password = options.password;
			inputOptions.placeHolder = options.placeHolder;
			inputOptions.prompt = options.prompt;
			inputOptions.value = options.value;
		}

		if (validateInput) {
			inputOptions.validateInput = (value) => {
				return this._proxy.$validateInput(value);
			};
		}

		return this._quickOpenService.input(inputOptions);
	}
}
