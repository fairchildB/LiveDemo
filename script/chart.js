function createBarChart(urbanBridges, totalUrbanPavementLength, smallUrbanBridges, totalSmallUrbanPavementLength) {
    var barChartCanvas = document.getElementById('barChart');
    barChartCanvas.width = 400;
    barChartCanvas.height = 400;

    // Position the chart in the lower right quadrant
    barChartCanvas.style.position = 'absolute';
    barChartCanvas.style.bottom = '0';
    barChartCanvas.style.right = '0';

    var barChartCtx = barChartCanvas.getContext('2d');

    var chartData = {
        labels: ['Bridges', 'Pavement (in miles)'],
        datasets: [{
            data: [urbanBridges, totalUrbanPavementLength],
            backgroundColor: ['#0000FF', '#0000FF'],
            label: ['Urban FABs'],
        },
        {
            data: [smallUrbanBridges, totalSmallUrbanPavementLength],
            backgroundColor: ['#008000', '#008000'],
            label: ['Small Urban FABs'],
        }]
    };

    


    var barChart = new Chart(barChartCtx, {
        type: 'bar',
        data: chartData,
    });
}
