// OST 時間格式轉換工具測試
// 時間格式: 2022/01/29 21:16:37

/**
 * 測試時間格式轉換函數
 */
const testOstTimeFormatConversion = () => {
  console.log('=== OST 時間格式轉換測試 ===');
  
  // 測試用例
  const testCases = [
    {
      input: '2022-01-29T21:16',
      expected: '2022/01/29 21:16:00',
      description: 'datetime-local 轉 OST 格式'
    },
    {
      input: '2022/01/29 21:16:37',
      expected: '2022-01-29T21:16',
      description: 'OST 格式轉 datetime-local'
    },
    {
      input: '2022-12-31T23:59',
      expected: '2022/12/31 23:59:00',
      description: '年末時間轉換'
    }
  ];
  
  // 格式轉換函數
  const formatToOstDateTime = (datetimeLocal) => {
    if (!datetimeLocal) return '';
    
    const date = new Date(datetimeLocal);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };
  
  const formatToDateTimeLocal = (ostDateTime) => {
    if (!ostDateTime) return '';
    
    try {
      const [datePart, timePart] = ostDateTime.split(' ');
      const [year, month, day] = datePart.split('/');
      const [hours, minutes] = timePart.split(':');
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    } catch (error) {
      console.error('轉換錯誤:', error);
      return '';
    }
  };
  
  // 執行測試
  testCases.forEach((testCase, index) => {
    let result;
    let isCorrect;
    
    if (testCase.description.includes('datetime-local 轉 OST')) {
      result = formatToOstDateTime(testCase.input);
      isCorrect = result === testCase.expected;
    } else {
      result = formatToDateTimeLocal(testCase.input);
      isCorrect = result === testCase.expected;
    }
    
    console.log(`測試 ${index + 1}: ${testCase.description}`);
    console.log(`  輸入: ${testCase.input}`);
    console.log(`  預期: ${testCase.expected}`);
    console.log(`  結果: ${result}`);
    console.log(`  狀態: ${isCorrect ? '✅ 通過' : '❌ 失敗'}`);
    console.log('---');
  });
  
  console.log('=== 測試完成 ===');
};

export { testOstTimeFormatConversion };