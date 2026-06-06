const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { password } = event;
  
  try {
    const res = await db.collection('settings').doc('shop').get();
    const shopPassword = res.data.shopPassword;
    
    if (!shopPassword) {
      return { success: false, message: '未设置密码' };
    }
    
    if (password === shopPassword) {
      return { success: true, message: '验证成功' };
    } else {
      return { success: false, message: '密码错误' };
    }
  } catch (err) {
    console.error(err);
    return { success: false, message: '验证失败' };
  }
};
