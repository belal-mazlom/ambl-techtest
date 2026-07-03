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
import { useSyncExternalStore } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const subscribeToHydration = () => () => {};

const getHydratedSnapshot = (): boolean => true;

const getHydratedServerSnapshot = (): boolean => false;

/**
 * Returns `true` after the client has hydrated. SSR snapshot is always `false`.
 */
export function useIsHydrated(): boolean {
    return useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getHydratedServerSnapshot);
}
