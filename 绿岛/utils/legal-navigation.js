export function closeLegalPage(){
 let depth=0
 try{depth=getCurrentPages().length}catch{}
 if(depth>1){uni.navigateBack({delta:1});return}
 if(uni.getStorageSync('fire_login_status')===true)uni.switchTab({url:'/pages/profile/index'})
 else uni.reLaunch({url:'/pages/login/login'})
}
