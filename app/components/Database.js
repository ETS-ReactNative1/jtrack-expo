import SQLite from "react-native-sqlite-storage";
import { weather_api_key } from '../../api';

const database_name = "JTrackDatabase.db";
const database_displayname = "JTrack SQLite React Offline Database";
const database_size = 200000;


export default class Database{
    constructor(){
        this.db = SQLite.openDatabase({ name: database_name });
    }

    setupDatabase(){
      return new Promise((resolve) => {
        this.db.transaction(function(txn) {
            txn.executeSql(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='exercises'",
              [],
              function(tx, res) {
                if (res.rows.length == 0) {
                  txn.executeSql('DROP TABLE IF EXISTS exercises', []);
                  txn.executeSql(
                    'CREATE TABLE IF NOT EXISTS exercises(id INTEGER PRIMARY KEY AUTOINCREMENT, minutes INTEGER, action_date DATETIME)',
                    []
                  );
                  /*
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (10, "2020-03-16 00:00:00")');
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (10, "2020-03-17 00:00:00")');
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (40, "2020-03-18 00:00:00")');
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (40, "2020-03-19 00:00:00")');
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (20, "2020-03-20 00:00:00")');
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (45, "2020-04-21 00:00:00")');
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (30, "2020-04-22 00:00:00")');
                  txn.executeSql('INSERT INTO exercises (minutes, action_date)  VALUES (10, "2020-04-23 00:00:00")');
                  */
                }
              }
            );
        });
      });
    }

    getWeatherFromAPI = async (lat, lon) => {
      const weather_key = weather_api_key;
      const api = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weather_key}&units=imperial`;
      const response = await fetch(api);
      const jsonData = await response.json();
      return jsonData;
    }

    //Save Exercise
    saveExercise(minutes, action_date){
      return new Promise((resolve) => {
        var that = this;
        if (minutes < 1){
          that.deleteExercise(action_date);
          resolve(true);
        } 
        else {
          that.updateExercise(minutes, action_date).then((data) => {
            if (!data) {
              that.createExercise(minutes, action_date).then((data) => {
                resolve(true);
              }).catch((err) => {
                console.log(err);
                resolve(false);
              });
            } else {
              resolve(true);
            }
          }).catch((err) => {
            console.log(err);
            resolve(false);
          });
        }
      });
    }

    //Update Exercise
    updateExercise = (minutes, action_date) => {
      return new Promise((resolve) => {
        this.db.transaction(function(tx) {
          tx.executeSql('SELECT minutes FROM exercises WHERE action_date = ?', 
          [action_date], 
          (tx, results) => {
            len = results.rows.length;
            if (len > 0){
              tx.executeSql(
                'UPDATE exercises SET minutes = ? WHERE action_date = ?',
                [minutes, action_date],
                (tx, results) => {
                if (results.rowsAffected > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
                this.closeMenu();
                }
              );
            }
            else {
              resolve(false);
            } 
          });
        });
      });
    }

    //Add Exercise
    createExercise(minutes, action_date){
      console.log('here');
      return new Promise((resolve) => {
        this.db.transaction(function(tx) {
            tx.executeSql(
                'INSERT INTO exercises (minutes, action_date) VALUES (?, ?)',
                [minutes, action_date],
                (tx, results) => {
                if (results.rowsAffected > 0) {
                  console.log(results);
                    resolve(true);
                } else {
                    resolve(false);
                }
                this.closeMenu();
                }
            );
        });
      });
    }

    //Delete Exercise
    deleteExercise(action_date){
      return new Promise((resolve) => {
        this.db.transaction(function(tx) {
          tx.executeSql('DELETE FROM exercises WHERE action_date = ?', 
          [action_date], (tx, results) => {
            resolve(results);
          });
        });
      });
    }

    //Today's date in DATETIME formatting
    getTodayFullDate(){
      var date = new Date(); 
      var todaydate = date.getFullYear();
      todaydate += "-" + ("0" + (date.getMonth() + 1)).slice(-2);
      todaydate += "-" + ("0" + date.getDate()).slice(-2);
      todaydate += " 00:00:00";
      return todaydate;
    }

    getExercise(action_date = false){
      //Default to today's date
      if (!action_date){
        action_date = this.getTodayFullDate();
      }

      return new Promise((resolve) => {
        this.db.transaction(tx => {
          tx.executeSql(
            'SELECT minutes FROM exercises where action_date = ?',
            [action_date],
            (tx, results) => {
              var len = results.rows.length;
              if (len > 0) {
                resolve(results.rows.item(0).minutes);
              } else {
                resolve(0);
              }
            }
          );
        });
      });
    }

    //Get a yearly list of exercises saved
    getYearlyMarkedDates = ({year}) => {
      var start_date = year + "-01-01 00:00:00";  
      var end_date = year + "-12-31 23:59:59";
      return new Promise((resolve) => {
        this.db.transaction(tx => {
          tx.executeSql(
            'SELECT minutes, SUBSTR (action_date, 1 ,10) AS action_date, id FROM exercises where action_date > ? AND action_date < ?',
            [start_date, end_date],
            (tx, results) => {
              var len = results.rows.length;
              var json_marked_dates = {};
              if (len > 0) {
                for (let i = 0; i < len; i++) {
                  let row = results.rows.item(i);
                  minutes = row.minutes;
                  action_date = row.action_date;
                  json_marked_dates[row.action_date] = {selected: true, minutes: minutes};  
                }
                resolve(json_marked_dates);
              } else {
                resolve(0);
              }
            }
          );
        });
      });

    }

    //Returns numbers of days between two DateTime strings.
    sqlDayDiff = ({startDate, endDate}) => {
      var startDateOb = new Date(startDate.substr(0, 10));
      var endDateOb = new Date(endDate.substr(0, 10));
      var timeDiff = endDateOb.getTime() - startDateOb.getTime(); 
      var dayDiff = timeDiff / (1000 * 3600 * 24);
      return dayDiff;
    }

    //Adds Days to Date Object
    addDays(date, days) {
      const copy = new Date(Number(date))
      copy.setDate(date.getDate() + days)
      return copy
    }

    getStatsFromDateRange = ({startDate, endDate}) => {
      var that = this;
      return new Promise((resolve) => {
      this.db.transaction(tx => {
          tx.executeSql(
            'SELECT minutes, SUBSTR (action_date, 1 ,10) AS action_date, id FROM exercises where action_date > ? AND action_date < ? ORDER BY action_date DESC',
            [startDate, endDate],
            (tx, results) => {
              var len = results.rows.length;
              var graphData = [];
              var dayDiff = that.sqlDayDiff({startDate, endDate});
              var dateItrStr = startDate.substr(0, 10); //yyyy-mm-dd
              var dateItr = new Date(dateItrStr);
              var dateArray = {};

              if (len > 0) {
                for (let i = 0; i < len; i++) {
                  let row = results.rows.item(i);
                  minutes = row.minutes;
                  action_date = row.action_date;
                  dateArray[action_date] = minutes; 
                }
              }

              for (let i = 0; i < dayDiff; i++) {
                if (dateItrStr in dateArray){
                  graphData[i] = dateArray[dateItrStr];
                } else {
                  graphData[i] = 0;
                }

                dateItr = this.addDays(dateItr, 1);
                var day = ("0" + dateItr.getDate()).slice(-2);
                var month = ("0" + (dateItr.getMonth() + 1)).slice(-2);
                dateItrStr = dateItr.getUTCFullYear() + "-" + month + "-" + day;
              }
              resolve(graphData);
            }
          );
        });
      });
    }
}