document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.querySelector('#dataTable tbody');
    const predictedNumberElement = document.getElementById('predictedNumber');
    const predictedPremiumElement = document.getElementById('predictedPremium');
    const timerElement = document.getElementById('timeRemaining');
    const historyTableBody = document.querySelector('#predictionHistoryTable tbody');
    let predictionHistory = JSON.parse(localStorage.getItem('predictionHistory')) || [];
    let lastPrediction = JSON.parse(localStorage.getItem('lastPrediction'));
    let currentPrediction = JSON.parse(localStorage.getItem('currentPrediction'));
    let currentPage = 0;
    const itemsPerPage = 10;

    const fetchNoAverageEmerdList = () => {
        const requestData = {
            pageSize: 10,
            pageNo: 1,
            typeId: 1,
            language: 0,
            random: "ded40537a2ce416e96c00e5218f6859a",
            signature: "69306982EEEB19FA940D72EC93C62552",
            timestamp: 1721383261
        };

        return fetch('https://api.bdg88zf.com/api/webapi/GetNoaverageEmerdList', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .catch(error => console.error('Error fetching no average EMERD list data:', error));
    };

    const fetchGameIssue = () => {
        const requestData = {
            typeId: 1,
            language: 0,
            random: "f8dcb5c527814db68800e3946a2b60e8",
            signature: "08CF7FF3339ED58D4743F4B650FCBEA9",
            timestamp: 1721383261
        };

        return fetch('https://api.bdg88zf.com/api/webapi/GetGameIssue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .catch(error => console.error('Error fetching game issue:', error));
    };

    const categorizeNumber = (number) => {
        if (number >= 0 && number <= 4) {
            return 'Small';
        } else if (number >= 5 && number <= 9) {
            return 'Big';
        } else {
            return 'Unknown';
        }
    };

    const generateRandomPrediction = () => {
        const randomNumber = Math.floor(Math.random() * 10); // Generate random number between 0 and 9
        const randomCategory = categorizeNumber(randomNumber);
        const randomPremium = 'N/A'; // Adjust as needed for your use case

        return {
            number: randomNumber,
            category: randomCategory,
            premium: randomPremium
        };
    };

    const updateDataAndPrediction = () => {
        fetchNoAverageEmerdList()
            .then(data => {
                const list = data.data.list;
                tableBody.innerHTML = ''; // Clear previous data
                list.forEach(item => {
                    const numberCategory = categorizeNumber(Number(item.number));
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.issueNumber}</td>
                        <td>${item.number} (${numberCategory})</td>
                        <td>${item.colour}</td>
                        <td>${item.premium}</td>
                    `;
                    tableBody.appendChild(row);
                });

                const latestIssue = list[0].issueNumber;
                const latestActual = Number(list[0].number);
                const actualCategory = categorizeNumber(latestActual);

                // Only generate a new prediction if one isn't already stored for this issue
                if (!currentPrediction || currentPrediction.issueNumber !== latestIssue) {
                    currentPrediction = generateRandomPrediction();
                    currentPrediction.issueNumber = latestIssue;
                    localStorage.setItem('currentPrediction', JSON.stringify(currentPrediction));
                }

                predictedNumberElement.textContent = `Predicted Number: ${currentPrediction.number} (${currentPrediction.category})`;
                predictedPremiumElement.textContent = `Predicted Premium: ${currentPrediction.premium}`;

                let result = 'N/A';

                if (lastPrediction) {
                    if (lastPrediction.issueNumber === latestIssue) {
                        result = (currentPrediction.category === actualCategory) ? 'Win' : 'Loss';
                    } else {
                        result = (lastPrediction.category === actualCategory) ? 'Win' : 'Loss';
                    }
                }

                if (lastPrediction && lastPrediction.issueNumber !== latestIssue) {
                    predictionHistory.push({
                        issueNumber: lastPrediction.issueNumber,
                        predictedNumber: lastPrediction.number,
                        actualNumber: latestActual,
                        result: result
                    });
                    localStorage.setItem('predictionHistory', JSON.stringify(predictionHistory));
                }

                lastPrediction = {
                    issueNumber: latestIssue,
                    number: currentPrediction.number,
                    category: currentPrediction.category
                };
                localStorage.setItem('lastPrediction', JSON.stringify(lastPrediction));

                updatePredictionHistoryTable();
            })
            .catch(error => console.error('Error fetching no average EMERD list data:', error));
    };

    const updatePredictionHistoryTable = () => {
        historyTableBody.innerHTML = ''; // Clear previous data

        predictionHistory.sort((a, b) => b.issueNumber - a.issueNumber);

        const start = currentPage * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedHistory = predictionHistory.slice(start, end);

        paginatedHistory.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.issueNumber}</td>
                <td>${entry.predictedNumber}</td>
                <td>${entry.actualNumber}</td>
                <td>${entry.result}</td>
            `;
            historyTableBody.appendChild(row);
        });

        document.getElementById('prevPage').disabled = currentPage === 0;
        document.getElementById('nextPage').disabled = end >= predictionHistory.length;
    };

    const updateTimer = () => {
        fetchGameIssue()
            .then(data => {
                const { startTime, endTime, serviceTime, intervalM } = data.data;
                const endDate = new Date(endTime);
                const intervalMs = intervalM * 60 * 1000; // Convert minutes to milliseconds
                const now = new Date();
                const remainingTimeMs = endDate - now;

                if (remainingTimeMs <= 0) {
                    timerElement.textContent = "Time Remaining: 00:00:00";
                    clearInterval(timerInterval);
                    updateDataAndPrediction(); // Fetch new data and predictions
                    currentPrediction = generateRandomPrediction(); // Generate new prediction
                    localStorage.setItem('currentPrediction', JSON.stringify(currentPrediction)); // Save new prediction
                    timerInterval = setInterval(updateTimer, 1000); // Restart the timer
                } else {
                    const hours = String(Math.floor(remainingTimeMs / (1000 * 60 * 60))).padStart(2, '0');
                    const minutes = String(Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
                    const seconds = String(Math.floor((remainingTimeMs % (1000 * 60)) / 1000)).padStart(2, '0');
                    timerElement.textContent = `Time Remaining: ${hours}:${minutes}:${seconds}`;
                }
            })
            .catch(error => console.error('Error fetching game issue:', error));
    };

    // Fetch initial data and start the timer
    updateDataAndPrediction();
    let timerInterval = setInterval(updateTimer, 1000);

    // Pagination controls
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            updatePredictionHistoryTable();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        if ((currentPage + 1) * itemsPerPage < predictionHistory.length) {
            currentPage++;
            updatePredictionHistoryTable();
        }
    });

    // Load initial prediction history table
    updatePredictionHistoryTable();
});