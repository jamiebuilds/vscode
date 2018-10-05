/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as strings from 'vs/base/common/strings';
import * as paths from 'vs/base/common/paths';

function baseCompare(one: string, other: string, caseSensitive = false, numeric = true): number {
	return one.localeCompare(other, undefined, {
		numeric,
		sensitivity: caseSensitive ? 'case' : 'base',
	});
}

// Using the numeric option in the collator will
// make compare(`foo1`, `foo01`) === 0. We must disambiguate.
function baseCompareFixNumeric(one: string, other: string, caseSensitive = false): number {
	let result = baseCompare(one, other, caseSensitive);
	if (result !== 0) {
		return result;
	}
	return baseCompare(one, other, caseSensitive, false);
}

export function compareFileNames(one: string, other: string, caseSensitive = false): number {
	return baseCompare(one, other, caseSensitive);
}

const FileNameMatch = /^(.*?)(\.([^.]*))?$/;

function extractNameAndExtension(str?: string): [string, string] {
	const match = str ? FileNameMatch.exec(str) : [] as RegExpExecArray;

	return [(match && match[1]) || '', (match && match[3]) || ''];
}

export function compareFileExtensions(one: string, other: string): number {
	const [oneName, oneExtension] = extractNameAndExtension(one.toLowerCase());
	const [otherName, otherExtension] = extractNameAndExtension(other.toLowerCase());

	if (oneExtension !== otherExtension) {
		return baseCompareFixNumeric(oneExtension, otherExtension);
	}

	return baseCompareFixNumeric(oneName, otherName);
}

function comparePathComponents(one: string, other: string, caseSensitive = false): number {
	return baseCompareFixNumeric(one, other, caseSensitive);
}

export function comparePaths(one: string, other: string, caseSensitive = false): number {
	const oneParts = one.split(paths.nativeSep);
	const otherParts = other.split(paths.nativeSep);

	const lastOne = oneParts.length - 1;
	const lastOther = otherParts.length - 1;
	let endOne: boolean, endOther: boolean;

	for (let i = 0; ; i++) {
		endOne = lastOne === i;
		endOther = lastOther === i;

		if (endOne && endOther) {
			return compareFileNames(oneParts[i], otherParts[i], caseSensitive);
		} else if (endOne) {
			return -1;
		} else if (endOther) {
			return 1;
		}

		const result = comparePathComponents(oneParts[i], otherParts[i], caseSensitive);

		if (result !== 0) {
			return result;
		}
	}
}

export function compareAnything(one: string, other: string, lookFor: string): number {
	let elementAName = one.toLowerCase();
	let elementBName = other.toLowerCase();

	// Sort prefix matches over non prefix matches
	const prefixCompare = compareByPrefix(one, other, lookFor);
	if (prefixCompare) {
		return prefixCompare;
	}

	// Sort suffix matches over non suffix matches
	let elementASuffixMatch = strings.endsWith(elementAName, lookFor);
	let elementBSuffixMatch = strings.endsWith(elementBName, lookFor);
	if (elementASuffixMatch !== elementBSuffixMatch) {
		return elementASuffixMatch ? -1 : 1;
	}

	// Understand file names
	let result = compareFileNames(elementAName, elementBName);
	if (result !== 0) {
		return result;
	}

	// Compare by name
	return baseCompareFixNumeric(elementAName, elementBName);
}

export function compareByPrefix(one: string, other: string, lookFor: string): number {
	let elementAName = one.toLowerCase();
	let elementBName = other.toLowerCase();

	// Sort prefix matches over non prefix matches
	let elementAPrefixMatch = strings.startsWith(elementAName, lookFor);
	let elementBPrefixMatch = strings.startsWith(elementBName, lookFor);
	if (elementAPrefixMatch !== elementBPrefixMatch) {
		return elementAPrefixMatch ? -1 : 1;
	}

	// Same prefix: Sort shorter matches to the top to have those on top that match more precisely
	else if (elementAPrefixMatch && elementBPrefixMatch) {
		if (elementAName.length < elementBName.length) {
			return -1;
		}

		if (elementAName.length > elementBName.length) {
			return 1;
		}
	}

	return 0;
}