/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, test, expect } from 'vitest';
import { buildVariantSummary } from './build-variant-summary';
import type { VariationAttribute } from '@/hooks/product/use-variation-attributes';

const createAttribute = (
    id: string,
    name: string,
    selectedName?: string
): VariationAttribute => ({
    id,
    name,
    selectedValue: selectedName ? { name: selectedName, value: selectedName } : {},
    values: [],
});

describe('buildVariantSummary', () => {
    test('formats multiple selected attributes', () => {
        const summary = buildVariantSummary([
            createAttribute('size', 'Size', 'M'),
            createAttribute('color', 'Colour', 'Black'),
        ]);

        expect(summary).toBe('Size: M · Colour: Black');
    });

    test('returns empty string when no attributes are selected', () => {
        const summary = buildVariantSummary([
            createAttribute('size', 'Size'),
            createAttribute('color', 'Colour'),
        ]);

        expect(summary).toBe('');
    });

    test('handles a single selected attribute', () => {
        const summary = buildVariantSummary([createAttribute('size', 'Size', 'L')]);

        expect(summary).toBe('Size: L');
    });

    test('skips attributes without a display name', () => {
        const summary = buildVariantSummary([
            {
                id: 'size',
                name: 'Size',
                selectedValue: { value: '040' },
                values: [],
            },
            createAttribute('color', 'Colour', 'Navy'),
        ]);

        expect(summary).toBe('Colour: Navy');
    });
});
