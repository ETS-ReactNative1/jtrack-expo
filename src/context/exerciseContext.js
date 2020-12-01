import createDataContext from './createDataContext';
import DB from '../api/database';

import testExerciseData from '../testExerciseData';

const db = new DB();

const exerciseReducer = (state, action)=>{
    switch(action.type){
        case 'fetch_graph_ex':
            return {...state, graphExercises: action.payload};
        case 'fetch_calendar_ex':
            return {...state, calendarExercises: action.payload};
        case 'fetch_exercise':
            return {...state, exercise: action.payload};
        case 'save_exercise':
            return state;
        case 'update_selected_date':
            return {...state, selectedDate: action.payload};
        case 'error':
            return {...state, error:action.payload}; 
        default:
            return state;
    }
};


//Default state.selectedDate value.
const defaultDate = new Date();


//Changes the selectedDate state variable by a given amount of months.
const updateSelectedDate = dispatch => (date, numOfMonths) => {
    date.setMonth(date.getMonth() + numOfMonths);
    dispatch({type: 'update_selected_date', payload: date});
}


//Get exercises data for calendar screen.
const fetchCalendarExercises = dispatch => (startDate) =>{

    db.fetchExercises(startDate)
    .then((results)=>{
        const exercisesObj = {};
        results.map((item)=>{
            let date = item.date.slice(0, -9);
            exercisesObj[date] = {marked: true, minutes: item.time};
        }); 
        dispatch({type:'fetch_calendar_ex', payload: exercisesObj});
    })
    .catch((err)=>{
        console.log(err);
        dispatch({type: 'error', payload: 'Fetch Calendar Data Failed.'});
    });

};


//Graph Screen Exercises
const fetchGraphExercises = dispatch => (startDate) =>{

    db.fetchExercises(startDate)
    .then((results)=>{
        //Formatting database results to work wth line graph component.
        const resultsObj = {};
        results.map((item)=>{
            let newDate = SQLDateToJSDate(item.date);
            if (
                newDate.getMonth() === (startDate.getMonth()) &&
                (newDate.getFullYear() == startDate.getFullYear())
                ){
                let day = parseInt(item.date.slice(8, -9));
                resultsObj[day] = {time: item.time, date: newDate};
            }
        });

        //Inserting default date data for line graph data points.
        const resultsArray = [];
        const daysInMonth = getDaysInMonth(startDate.getMonth(), startDate.getFullYear())
        for (let day = 1; day <= daysInMonth; day++){
            if (resultsObj[day]){
                resultsArray.push(resultsObj[day]);
            } else {
                let zeroDate = new Date(startDate.getFullYear(), startDate.getMonth(), day, 0,0);
                let zeroEntry = {time: 0, date: zeroDate};
                resultsArray.push(zeroEntry);
            }
        }

        dispatch({type:'fetch_graph_ex', payload: resultsArray});
    })
    .catch((err)=>{
        console.log(err);
        dispatch({type: 'error', payload: 'Fetch Graph Data Failed.'});
    });

};


//Saves a single exercise record to the database. 
const saveExercise = dispatch => async (date, minutes, callback) => {

    date = new Date(date);
    db.saveExercise(date, minutes).then((saved)=>{
        return db.fetchExercises(date);
    }).then((results)=>{
        dispatch({type: 'exercise_saved', payload: results});
        callback();
    }).catch((err)=>{
        console.log(err);
        dispatch({type: 'error', payload: 'Save Failed.'});
        callback();
    });
};


//Helper function to get number of days in the month.
function getDaysInMonth (month, year) {
    return new Date(year, month, 0).getDate();
};


//Helper function to convert a SQL DATETIME string to Javascript DateTime object.
const SQLDateToJSDate = (sqldate) => {
    const t = sqldate.split(/[- :]/);
    const d = new Date(t[0], t[1]-1, t[2], 0, 0);
    return d;
};


export const {Context, Provider} = createDataContext(
    exerciseReducer,
    {
        fetchCalendarExercises, 
        fetchGraphExercises, 
        saveExercise,
        updateSelectedDate
    },
    {
        selectedDate: defaultDate, 
        calendarExercises: null, 
        graphExercises: null, 
        exercise: {time: 0, date: '2020-01-01 00:00:00'}
    }
);