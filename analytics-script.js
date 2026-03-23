// Google Apps Script 代码 - 网站访问统计系统
// Spreadsheet ID: 1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE

function doPost(e) {
  try {
    console.log('=== doPost 接收到请求 ===');
    console.log('Request content:', e.postData.contents);
    
    const spreadsheet = SpreadsheetApp.openById('1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE');
    const data = JSON.parse(e.postData.contents);
    const eventType = data.eventType || 'page_visit';
    
    console.log('事件类型:', eventType);
    console.log('数据内容:', JSON.stringify(data));
    
    if (eventType === 'ad_guide_triggered') {
      console.log('>>> 处理广告引导事件');
      handleAdGuideEvent(spreadsheet, data);
    } else {
      console.log('>>> 处理页面访问事件');
      handlePageVisitEvent(spreadsheet, data);
    }
    
    console.log('=== 处理完成 ===');
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error stack:', error.stack);
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Analytics endpoint is working!').setMimeType(ContentService.MimeType.TEXT);
}


// ==================== 广告引导事件处理 ====================

function handleAdGuideEvent(spreadsheet, data) {
  console.log('>>> handleAdGuideEvent 开始执行');
  console.log('接收到的数据:', JSON.stringify(data));
  
  const dateString = getDateString();
  console.log('日期字符串:', dateString);
  
  const adGuideSheet = getOrCreateAdGuideSheet(spreadsheet, dateString);
  console.log('Sheet 名称:', adGuideSheet.getName());
  
  const rowData = [
    getTimeString(),              // 时间
    data.page || '',              // 访问页面
    data.userAgent || '',         // 用户属性
    data.userIP || 'Unknown',     // IP地址
    data.totalAdsSeen || 0,       // 累计广告数
    data.currentPageAds || 0,     // 当前页广告数
    data.triggerCount || 0,       // 触发次数
    data.maxTriggers || 3,        // 最大触发次数
    data.timestamp || ''          // 事件时间戳
  ];
  
  console.log('准备插入的数据:', JSON.stringify(rowData));
  adGuideSheet.appendRow(rowData);
  console.log('✅ 广告引导事件已记录到表格');
}

function getOrCreateAdGuideSheet(spreadsheet, dateString) {
  const sheetName = `广告引导-${dateString}`;
  console.log('尝试获取/创建 Sheet:', sheetName);
  
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    console.log('Sheet 不存在，开始创建新 Sheet');
    sheet = spreadsheet.insertSheet(sheetName);
    
    sheet.getRange(1, 1, 1, 9).setValues([
      ['时间', '访问页面', '用户属性', 'IP地址', '累计广告数', '当前页广告数', '触发次数', '最大触发次数', '事件时间戳']
    ]);
    
    const headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setBackground('#FF6B6B').setFontColor('white').setFontWeight('bold');
    
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 120);
    sheet.setColumnWidth(9, 180);
    
    console.log('✅ 新 Sheet 创建完成');
  } else {
    console.log('Sheet 已存在，使用现有 Sheet');
  }
  
  return sheet;
}

// ==================== 页面访问事件处理 ====================

function handlePageVisitEvent(spreadsheet, data) {
  const dateString = getDateString();
  const todaySheet = getOrCreateDailySheet(spreadsheet, dateString);
  
  const rowData = [
    getTimeString(),              // 时间
    data.page || '',              // 访问页面
    data.userAgent || '',         // 用户属性
    data.userIP || 'Unknown'      // IP地址
  ];
  
  todaySheet.appendRow(rowData);
  
  // 1%概率执行统计更新
  if (Math.random() < 0.01) {
    updateDashboard(spreadsheet, dateString);
    cleanupOldSheets(spreadsheet);
    updateStatisticsTable(spreadsheet);
  }
}

function getOrCreateDailySheet(spreadsheet, dateString) {
  const sheetName = `详细-${dateString}`;
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, 4).setValues([
      ['时间', '访问页面', '用户属性', 'IP地址']
    ]);
    
    const headerRange = sheet.getRange(1, 1, 1, 4);
    headerRange.setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
  }
  
  return sheet;
}

// ==================== 工具函数 ====================

function getDateString() {
  return new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
}

function getTimeString() {
  return new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// ==================== 控制台统计 ====================

function updateDashboard(spreadsheet, currentDate) {
  try {
    let dashboardSheet = spreadsheet.getSheetByName('📊控制台');
    if (!dashboardSheet) {
      dashboardSheet = spreadsheet.insertSheet('📊控制台', 0);
      initializeDashboard(dashboardSheet);
    }
    
    const todaySheet = spreadsheet.getSheetByName(`详细-${currentDate}`);
    if (todaySheet) {
      const rowCount = Math.max(0, todaySheet.getDataRange().getNumRows() - 1);
      dashboardSheet.getRange(2, 2).setValue(rowCount);
      dashboardSheet.getRange(2, 3).setValue(new Date());
    }
    
    updateTotalStats(spreadsheet, dashboardSheet);
  } catch (error) {
    console.error('更新控制台失败:', error);
  }
}

function initializeDashboard(sheet) {
  sheet.getRange(1, 1, 1, 5).merge();
  sheet.getRange(1, 1).setValue('📊 网站访问统计控制台');
  
  const headers = [
    ['统计项目', '数值', '最后更新', '说明', ''],
    ['今日访问量', 0, '', '当天的访问次数', ''],
    ['总访问量', 0, '', '所有详细记录的总数', ''],
    ['活跃天数', 0, '', '有访问记录的天数', ''],
    ['平均日访问', 0, '', '每日平均访问量', '']
  ];
  
  sheet.getRange(2, 1, headers.length, 5).setValues(headers);
  sheet.getRange(1, 1).setBackground('#1a73e8').setFontColor('white').setFontSize(14).setFontWeight('bold');
  sheet.getRange(2, 1, 1, 5).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
}

function updateTotalStats(spreadsheet, dashboardSheet) {
  const sheets = spreadsheet.getSheets();
  let totalVisits = 0;
  let activeDays = 0;
  
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    if (sheetName.startsWith('详细-')) {
      const rowCount = Math.max(0, sheet.getDataRange().getNumRows() - 1);
      totalVisits += rowCount;
      if (rowCount > 0) activeDays++;
    }
  });
  
  dashboardSheet.getRange(3, 2).setValue(totalVisits);
  dashboardSheet.getRange(4, 2).setValue(activeDays);
  dashboardSheet.getRange(5, 2).setValue(activeDays > 0 ? Math.round(totalVisits / activeDays) : 0);
  
  const updateTime = new Date();
  dashboardSheet.getRange(3, 3).setValue(updateTime);
  dashboardSheet.getRange(4, 3).setValue(updateTime);
  dashboardSheet.getRange(5, 3).setValue(updateTime);
}

// ==================== 数据清理 ====================

function cleanupOldSheets(spreadsheet) {
  try {
    const sheets = spreadsheet.getSheets();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 2); // 改为2天清理
    
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      if (sheetName.startsWith('详细-') || sheetName.startsWith('广告引导-')) {
        const dateStr = sheetName.replace('详细-', '').replace('广告引导-', '');
        const sheetDate = new Date(dateStr);
        
        if (sheetDate < cutoffDate) {
          console.log(`删除过期数据表: ${sheetName}`);
          spreadsheet.deleteSheet(sheet);
        }
      }
    });
  } catch (error) {
    console.error('清理旧数据失败:', error);
  }
}

function manualCleanup() {
  const spreadsheet = SpreadsheetApp.openById('1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE');
  cleanupOldSheets(spreadsheet);
  updateDashboard(spreadsheet, getDateString());
  return '数据清理完成';
}

// ==================== 统计汇总表 ====================

function updateStatisticsTable(spreadsheet) {
  try {
    let statsSheet = spreadsheet.getSheetByName('📈统计汇总表');
    if (!statsSheet) {
      statsSheet = spreadsheet.insertSheet('📈统计汇总表', 1);
      initializeStatisticsTable(statsSheet);
    }
    
    const today = new Date().toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'numeric',
      day: 'numeric'
    });
    const todayLabel = `${today.split('/')[0]}月${today.split('/')[1]}日`;
    const todayStats = generateDailyStatistics(spreadsheet, todayLabel);
    
    updateStatsInTable(statsSheet, todayStats, todayLabel);
  } catch (error) {
    console.error('更新统计汇总表失败:', error);
  }
}

function initializeStatisticsTable(sheet) {
  sheet.getRange(1, 1, 1, 5).merge();
  sheet.getRange(1, 1).setValue('📈 网站访问统计汇总表');
  
  sheet.getRange(2, 1, 1, 5).setValues([
    ['时间', '域名来源', '书籍名称', '累计章节', '累计IP数量（去重）']
  ]);
  
  sheet.getRange(1, 1).setBackground('#1a73e8').setFontColor('white').setFontSize(14).setFontWeight('bold');
  sheet.getRange(2, 1, 1, 5).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');
  
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 120);
}

function generateDailyStatistics(spreadsheet, dateLabel) {
  const todaySheetName = `详细-${getDateString()}`;
  const todaySheet = spreadsheet.getSheetByName(todaySheetName);
  
  if (!todaySheet) {
    console.log('未找到今日数据表:', todaySheetName);
    return [];
  }
  
  const stats = {};
  const values = todaySheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const pageUrl = row[1] || '';
    const userIP = row[3] || '';
    
    if (!pageUrl || !userIP) continue;
    
    const urlInfo = parsePageUrl(pageUrl);
    if (!urlInfo) continue;
    
    const { domain, bookName, isChapter } = urlInfo;
    const key = `${domain}|${bookName}`;
    
    if (!stats[key]) {
      stats[key] = {
        domain: domain,
        bookName: bookName,
        chapterCount: 0,
        ipSet: new Set()
      };
    }
    
    if (isChapter) {
      stats[key].chapterCount++;
    }
    
    if (userIP && userIP !== 'Unknown' && userIP !== 'Error') {
      stats[key].ipSet.add(userIP);
    }
  }
  
  const result = [];
  for (const key in stats) {
    const stat = stats[key];
    result.push([
      dateLabel,
      stat.domain,
      stat.bookName,
      stat.chapterCount,
      stat.ipSet.size
    ]);
  }
  
  return result;
}

function parsePageUrl(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    
    const novelMatch = path.match(/\/novels\/([^\/]+)/);
    if (!novelMatch) return null;
    
    const bookName = novelMatch[1];
    const isChapter = path.includes('/chapter-');
    
    return { domain, bookName, isChapter };
  } catch (error) {
    console.error('URL解析失败:', url, error);
    return null;
  }
}

function updateStatsInTable(sheet, newStats, dateLabel) {
  if (!newStats || newStats.length === 0) {
    console.log('没有新的统计数据需要更新');
    return;
  }
  
  const dataRange = sheet.getDataRange();
  const existingData = dataRange.getNumRows() > 2 ? dataRange.getValues().slice(2) : [];
  const nonTodayData = existingData.filter(row => row[0] !== dateLabel);
  const allData = [...nonTodayData, ...newStats];
  
  if (dataRange.getNumRows() > 2) {
    sheet.getRange(3, 1, dataRange.getNumRows() - 2, 5).clear();
  }
  
  if (allData.length > 0) {
    sheet.getRange(3, 1, allData.length, 5).setValues(allData);
  }
  
  const lastRow = sheet.getLastRow() + 2;
  sheet.getRange(lastRow, 1, 1, 5).merge();
  sheet.getRange(lastRow, 1).setValue(`最后更新时间: ${getTimeString()}`);
  sheet.getRange(lastRow, 1).setFontStyle('italic').setFontColor('#666666');
  
  console.log(`统计表更新完成，共 ${allData.length} 条记录`);
}

function hourlyStatisticsUpdate() {
  const spreadsheet = SpreadsheetApp.openById('1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE');
  updateStatisticsTable(spreadsheet);
  return '每小时统计更新完成';
}

function manualStatisticsUpdate() {
  const spreadsheet = SpreadsheetApp.openById('1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE');
  updateStatisticsTable(spreadsheet);
  return '手动统计更新完成';
}

// ==================== 测试函数 ====================

function testAdGuideEvent() {
  console.log('=== 开始测试广告引导事件 ===');
  
  const spreadsheet = SpreadsheetApp.openById('1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE');
  
  const testData = {
    eventType: 'ad_guide_triggered',
    page: 'https://re.cankalp.com/novels/test/chapter-1',
    userAgent: 'Mozilla/5.0 (iPhone; Test)',
    referrer: 'https://re.cankalp.com/novels/test/index',
    userIP: '127.0.0.1',
    totalAdsSeen: 15,
    currentPageAds: 3,
    triggerCount: 2,
    maxTriggers: 3,
    timestamp: new Date().toISOString()
  };
  
  console.log('测试数据:', JSON.stringify(testData));
  
  try {
    handleAdGuideEvent(spreadsheet, testData);
    console.log('✅ 测试成功！');
    return '测试成功 - 请检查 Google Sheets 中的"广告引导-' + getDateString() + '"表格';
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return '测试失败: ' + error.toString();
  }
}

// ==================== 每日邮件发送 ====================

/**
 * 每天北京时间01:00发送表格到指定邮箱
 * 需要在Google Apps Script中设置触发器：每天01:00-02:00执行
 */
function sendDailyReport() {
  try {
    console.log('=== 开始执行每日报告发送 ===');
    const spreadsheet = SpreadsheetApp.openById('1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE');
    const recipientEmail = 'jannatjahan36487@gmail.com';
    
    // 生成报告内容
    const reportContent = generateDailyReportContent(spreadsheet);
    
    // 生成Excel附件
    const excelBlob = generateExcelReport(spreadsheet);
    
    // 发送邮件
    const subject = `📊 网站访问统计日报 - ${getDateString()}`;
    const body = reportContent.text;
    const htmlBody = reportContent.html;
    
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      attachments: [excelBlob]
    });
    
    console.log('✅ 每日报告已发送至:', recipientEmail);
    return '每日报告发送成功';
  } catch (error) {
    console.error('❌ 发送每日报告失败:', error);
    console.error('Error stack:', error.stack);
    return '发送失败: ' + error.toString();
  }
}

/**
 * 生成每日报告内容
 */
function generateDailyReportContent(spreadsheet) {
  const dateString = getDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayString = yesterdayDate.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
  
  // 获取控制台数据
  const dashboardSheet = spreadsheet.getSheetByName('📊控制台');
  let todayVisits = 0;
  let totalVisits = 0;
  let activeDays = 0;
  
  if (dashboardSheet) {
    todayVisits = dashboardSheet.getRange(2, 2).getValue() || 0;
    totalVisits = dashboardSheet.getRange(3, 2).getValue() || 0;
    activeDays = dashboardSheet.getRange(4, 2).getValue() || 0;
  }
  
  // 获取昨日统计数据
  const yesterdaySheet = spreadsheet.getSheetByName(`详细-${yesterdayString}`);
  let yesterdayVisits = 0;
  if (yesterdaySheet) {
    yesterdayVisits = Math.max(0, yesterdaySheet.getDataRange().getNumRows() - 1);
  }
  
  // 获取广告引导数据
  const adGuideSheet = spreadsheet.getSheetByName(`广告引导-${dateString}`);
  let adGuideTriggers = 0;
  if (adGuideSheet) {
    adGuideTriggers = Math.max(0, adGuideSheet.getDataRange().getNumRows() - 1);
  }
  
  // 获取统计汇总数据
  const statsSheet = spreadsheet.getSheetByName('📈统计汇总表');
  let topBooks = [];
  if (statsSheet && statsSheet.getLastRow() > 2) {
    const statsData = statsSheet.getRange(3, 1, statsSheet.getLastRow() - 2, 5).getValues();
    const todayStats = statsData.filter(row => row[0].includes(getDateString().split('-')[1] + '月'));
    topBooks = todayStats.sort((a, b) => b[3] - a[3]).slice(0, 5);
  }
  
  // 生成纯文本报告
  const textReport = `
📊 网站访问统计日报
==================

📅 报告日期：${dateString}
⏰ 生成时间：${getTimeString()}

📈 核心数据
----------------
🔹 今日访问量：${todayVisits} 次
🔹 昨日访问量：${yesterdayVisits} 次
🔹 总访问量：${totalVisits} 次
🔹 活跃天数：${activeDays} 天
🔹 平均日访问：${activeDays > 0 ? Math.round(totalVisits / activeDays) : 0} 次

🎯 广告引导数据
----------------
🔹 今日触发次数：${adGuideTriggers} 次

📚 今日热门书籍 TOP 5
----------------
${topBooks.length > 0 ? topBooks.map((book, index) => 
  `${index + 1}. ${book[2]} - ${book[3]} 章节`).join('\n') : '暂无数据'}

---
📧 本邮件由系统自动发送
🔗 查看完整数据：https://docs.google.com/spreadsheets/d/1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE
  `;
  
  // 生成HTML报告
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #4285f4;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4285f4;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #666;
      margin: 10px 0 0 0;
    }
    .section {
      margin: 25px 0;
    }
    .section-title {
      color: #4285f4;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      margin: 0;
    }
    .book-list {
      list-style: none;
      padding: 0;
    }
    .book-item {
      background: #f8f9fa;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      border-left: 4px solid #4285f4;
    }
    .book-name {
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }
    .book-stats {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 14px;
    }
    .footer a {
      color: #4285f4;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 网站访问统计日报</h1>
      <p>📅 ${dateString} | ⏰ ${getTimeString()}</p>
    </div>
    
    <div class="section">
      <div class="section-title">📈 核心数据</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">今日访问量</div>
          <div class="stat-value">${todayVisits}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">昨日访问量</div>
          <div class="stat-value">${yesterdayVisits}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总访问量</div>
          <div class="stat-value">${totalVisits}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">活跃天数</div>
          <div class="stat-value">${activeDays}</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">🎯 广告引导数据</div>
      <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
        <strong>今日触发次数：</strong> ${adGuideTriggers} 次
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">📚 今日热门书籍 TOP 5</div>
      ${topBooks.length > 0 ? `
        <ul class="book-list">
          ${topBooks.map((book, index) => `
            <li class="book-item">
              <div class="book-name">${index + 1}. ${book[2]}</div>
              <div class="book-stats">📖 章节访问：${book[3]} 次 | 👥 独立IP：${book[4]} 个</div>
            </li>
          `).join('')}
        </ul>
      ` : '<p style="color: #666;">暂无数据</p>'}
    </div>
    
    <div class="footer">
      <p>📧 本邮件由系统自动发送</p>
      <p><a href="https://docs.google.com/spreadsheets/d/1C0txPMZDHY7QCyPYd6k7pZsSb36KwFRRGfGGHpMkaeE" target="_blank">🔗 查看完整数据表格</a></p>
    </div>
  </div>
</body>
</html>
  `;
  
  return {
    text: textReport,
    html: htmlReport
  };
}

/**
 * 测试邮件发送功能
 */
function testEmailSend() {
  console.log('=== 开始测试邮件发送 ===');
  
  try {
    const result = sendDailyReport();
    console.log('✅ 测试邮件发送成功！');
    return '测试成功 - 请检查邮箱 jannatjahan36487@gmail.com';
  } catch (error) {
    console.error('❌ 测试邮件发送失败:', error);
    return '测试失败: ' + error.toString();
  }
}

// ==================== Excel附件生成 ====================

/**
 * 生成Excel格式的统计报告
 */
function generateExcelReport(spreadsheet) {
  try {
    console.log('=== 开始生成Excel报告 ===');
    const dateString = getDateString();
    
    // 创建一个临时的Spreadsheet用于导出
    const tempSpreadsheet = SpreadsheetApp.create(`统计报告-${dateString}`);
    const tempId = tempSpreadsheet.getId();
    
    // 获取所有sheet并复制相关的数据表
    const allSheets = spreadsheet.getSheets();
    const sheetsToCopy = ['📊控制台', '📈统计汇总表'];
    
    // 添加所有详细数据和广告引导数据sheet
    allSheets.forEach(sheet => {
      const sheetName = sheet.getName();
      if (sheetName.startsWith('详细-') || sheetName.startsWith('广告引导-')) {
        sheetsToCopy.push(sheetName);
      }
    });
    
    // 复制所有相关sheet到临时表格
    sheetsToCopy.forEach(sheetName => {
      copySheetToSpreadsheet(spreadsheet, tempSpreadsheet, sheetName);
    });
    
    // 删除默认的Sheet1
    const defaultSheet = tempSpreadsheet.getSheetByName('Sheet1');
    if (defaultSheet) {
      tempSpreadsheet.deleteSheet(defaultSheet);
    }
    
    // 将临时Spreadsheet导出为Excel格式
    const url = `https://docs.google.com/spreadsheets/d/${tempId}/export?format=xlsx`;
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    const excelBlob = response.getBlob();
    excelBlob.setName(`网站统计报告-${dateString}.xlsx`);
    
    // 删除临时Spreadsheet
    DriveApp.getFileById(tempId).setTrashed(true);
    
    console.log('✅ Excel报告生成完成');
    return excelBlob;
    
  } catch (error) {
    console.error('❌ 生成Excel报告失败:', error);
    throw error;
  }
}

/**
 * 复制Sheet到另一个Spreadsheet
 */
function copySheetToSpreadsheet(sourceSpreadsheet, targetSpreadsheet, sheetName) {
  try {
    const sourceSheet = sourceSpreadsheet.getSheetByName(sheetName);
    
    if (!sourceSheet) {
      console.log(`Sheet不存在，跳过: ${sheetName}`);
      return;
    }
    
    // 在目标表格中创建新Sheet
    const newSheet = targetSpreadsheet.insertSheet(sheetName);
    
    // 获取源Sheet的所有数据
    const sourceRange = sourceSheet.getDataRange();
    const sourceValues = sourceRange.getValues();
    const sourceFormats = sourceRange.getNumberFormats();
    
    // 复制数据
    if (sourceValues.length > 0 && sourceValues[0].length > 0) {
      const targetRange = newSheet.getRange(1, 1, sourceValues.length, sourceValues[0].length);
      targetRange.setValues(sourceValues);
      targetRange.setNumberFormats(sourceFormats);
    }
    
    // 复制列宽
    for (let i = 1; i <= sourceSheet.getMaxColumns(); i++) {
      const columnWidth = sourceSheet.getColumnWidth(i);
      newSheet.setColumnWidth(i, columnWidth);
    }
    
    // 复制格式（背景色、字体等）
    const lastRow = sourceSheet.getLastRow();
    const lastColumn = sourceSheet.getLastColumn();
    
    if (lastRow > 0 && lastColumn > 0) {
      const sourceFormatRange = sourceSheet.getRange(1, 1, lastRow, lastColumn);
      const targetFormatRange = newSheet.getRange(1, 1, lastRow, lastColumn);
      
      // 复制背景色
      targetFormatRange.setBackgrounds(sourceFormatRange.getBackgrounds());
      
      // 复制字体颜色
      targetFormatRange.setFontColors(sourceFormatRange.getFontColors());
      
      // 复制字体大小
      targetFormatRange.setFontSizes(sourceFormatRange.getFontSizes());
      
      // 复制字体粗细
      targetFormatRange.setFontWeights(sourceFormatRange.getFontWeights());
      
      // 复制字体样式
      targetFormatRange.setFontStyles(sourceFormatRange.getFontStyles());
    }
    
    console.log(`✅ 成功复制Sheet: ${sheetName}`);
    
  } catch (error) {
    console.error(`复制Sheet失败 (${sheetName}):`, error);
  }
}
