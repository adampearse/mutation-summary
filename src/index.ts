// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// @ts-ignore
// @ts-ignore

if (MutationObserver === undefined) {
  console.error('DOM Mutation Observers are required.');
  console.error('https://developer.mozilla.org/en-US/docs/DOM/MutationObserver');
  throw Error('DOM Mutation Observers are required');
}

export * from "./ChildListChange";
export * from "./IMutationSummaryOptions";
export * from "./INumberMap";
export * from "./IQuery";
export * from "./IStringMap";
export * from "./Movement";
export * from "./MutationProjection";
export * from "./MutationSummary";
export * from "./NodeChange";
export * from "./NodeMap";
export * from "./Qualifier";
export * from "./Selector";
export * from "./Summary";
export * from "./TreeChanges";
