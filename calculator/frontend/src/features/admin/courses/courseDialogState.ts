import {
  initialCourseFormState,
  type CourseAction,
  type CourseFormState,
} from "./courseDialogTypes"

export { buildCourseFormStatePayload } from "./courseDialogPayload"
export { initialCourseFormState }

function courseFormReducer(state: CourseFormState, action: CourseAction): CourseFormState {
  switch (action.type) {
    case "RESET":
      return { ...initialCourseFormState, ...action.payload }
    case "SET_FIELD":
      return { ...state, [action.field]: action.value }
    case "SET_TEXTBOOK":
      return {
        ...state,
        textbook: { ...state.textbook, [action.key]: action.value },
      }
    case "TOGGLE_DAY": {
      const list = state[action.field]
      const idx = action.value
      const single = !!action.single
      if (single) {
        return { ...state, [action.field]: [idx] }
      }
      return {
        ...state,
        [action.field]: list.includes(idx)
          ? list.filter((day) => day !== idx)
          : [...list, idx],
      }
    }
    case "ADD_DYNAMIC_TIME":
      return {
        ...state,
        dynamicOptions: [...state.dynamicOptions, { label: "", time: "" }],
      }
    case "UPDATE_DYNAMIC_TIME": {
      const nextOptions = [...state.dynamicOptions]
      nextOptions[action.index][action.key] = action.value
      return { ...state, dynamicOptions: nextOptions }
    }
    case "REMOVE_DYNAMIC_TIME":
      return {
        ...state,
        dynamicOptions: state.dynamicOptions.filter((_, index) => index !== action.index),
      }
    case "ADD_BREAK_RANGE":
      return {
        ...state,
        breakRanges: [...state.breakRanges, { startDate: "", endDate: "" }],
      }
    case "UPDATE_BREAK_RANGE": {
      const nextBreakRanges = [...state.breakRanges]
      nextBreakRanges[action.index] = {
        ...nextBreakRanges[action.index],
        [action.key]: action.value,
      }
      return { ...state, breakRanges: nextBreakRanges }
    }
    case "REMOVE_BREAK_RANGE":
      return {
        ...state,
        breakRanges: state.breakRanges.filter((_, index) => index !== action.index),
      }
    case "ADD_DAILY_FEE":
      return {
        ...state,
        dailyFees: [...state.dailyFees, { days: 0, fee: 0 }],
      }
    case "UPDATE_DAILY_FEE": {
      const nextFees = [...state.dailyFees]
      nextFees[action.index] = { ...nextFees[action.index], [action.key]: action.value }
      return { ...state, dailyFees: nextFees }
    }
    case "REMOVE_DAILY_FEE":
      return {
        ...state,
        dailyFees: state.dailyFees.filter((_, index) => index !== action.index),
      }
    case "TOGGLE_AVAILABLE_DATE": {
      const dateStr = action.date
      const has = state.availableDates.includes(dateStr)
      return {
        ...state,
        availableDates: has
          ? state.availableDates.filter((d) => d !== dateStr)
          : [...state.availableDates, dateStr].sort(),
      }
    }
    case "SET_AVAILABLE_DATES":
      return { ...state, availableDates: [...action.dates].sort() }
    default:
      return state
  }
}

export { courseFormReducer }

export type {
  BreakRange,
  CourseAction,
  CourseData,
  CourseFormState,
  DailyFeeEntry,
  DynamicOption,
  RecordingData,
  TextbookState,
  TimeData,
} from "./courseDialogTypes"
