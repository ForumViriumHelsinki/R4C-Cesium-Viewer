// src/constants/performance.js
export const BATCH_SIZES = {
    DEFAULT: 25,
    LARGE_DATASET: 15,
    SMALL_DATASET: 50,
    THRESHOLD_FOR_ADAPTIVE: 1000
  }
  
  export function getAdaptiveBatchSize(itemCount) {
    return itemCount > BATCH_SIZES.THRESHOLD_FOR_ADAPTIVE 
      ? BATCH_SIZES.LARGE_DATASET 
      : BATCH_SIZES.DEFAULT
  }