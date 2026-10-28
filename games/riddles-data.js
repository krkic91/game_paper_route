(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeRiddlesData=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Original picture-word prompts. Emoji are local pictograms, not remote images.
  // Each explanation spells out the intended reading after an answer is shown.
  const blocks={nature:`
cá ngựa|🐟 🐴|Một loài sống dưới biển, tên ghép từ hai con vật.|Cá + ngựa.
cá kiếm|🐟 ⚔️|Loài cá có phần mõm rất dài.|Cá + kiếm.
cá heo|🐟 🐷|Một loài thú biển thông minh.|Cá + heo.
cá vàng|🐟 🟨|Loài cá cảnh mang tên một màu.|Cá + vàng.
cá chuồn|🐟 🪽|Loài cá có thể lướt trên mặt nước.|Cá có vây như cánh, bay như chuồn.
cá voi|🐟 🐘|Loài thú biển có kích thước khổng lồ.|Cá + voi.
cá sấu|🐟 🦎|Bò sát lớn, hàm dài, sống cả dưới nước.|Hình cá gợi nước, thằn lằn gợi bò sát: cá sấu.
sao biển|⭐ 🌊|Một sinh vật biển có nhiều cánh.|Sao + biển.
chim cánh cụt|🐧 🪽|Loài chim bơi giỏi nhưng không bay.|Chim cánh cụt: hình dáng và cánh nhỏ.
chim ruồi|🐦 🪰|Loài chim rất nhỏ, có thể bay đứng.|Chim + ruồi.
chim công|🦚 👑|Loài chim thường xòe đuôi rực rỡ.|Đuôi xòe như chiếc vương miện của chim công.
chim sẻ|🐦 🌾|Loài chim nhỏ quen thuộc ở đồng quê.|Chim nhỏ tìm hạt lúa: chim sẻ.
chuột túi|🐭 👝|Con vật nuôi con trong một chiếc túi.|Chuột + túi.
chuột chũi|🐭 🕳️|Con vật đào hang dưới lòng đất.|Chuột sống trong hang đất: chuột chũi.
gấu trúc|🐻 🎋|Con vật thích ăn tre, có màu đen trắng.|Gấu + trúc.
gấu trắng|🐻 ⚪|Tên gọi khác của gấu vùng Bắc Cực.|Gấu + trắng.
bò sữa|🐄 🥛|Vật nuôi cung cấp thức uống bổ dưỡng.|Bò + sữa.
bò tót|🐂 💪|Loài bò hoang có thân hình rất khỏe.|Bò hoang to khỏe: bò tót.
ngựa vằn|🐴 ▥|Con vật có bộ lông sọc đen trắng.|Ngựa + những vằn sọc.
ngựa biển|🐴 🌊|Một tên gọi khác của cá ngựa.|Ngựa + biển.
tê giác|🦏 🔺|Con vật da dày có sừng trên mũi.|Dáng tê giác và chiếc sừng nhọn.
hươu cao cổ|🦒 📏|Con vật có chiếc cổ rất dài.|Hươu có cổ cao, dài như thước.
sư tử biển|🦁 🌊|Thú biển có thể di chuyển bằng chân chèo.|Sư tử + biển.
hải cẩu|🌊 🐕|Tên Hán Việt ghép biển với chó.|Hải là biển, cẩu là chó.
sứa biển|🪼 🌊|Sinh vật biển mềm, trong và có xúc tu.|Sứa + biển.
ốc sên|🐌 🍃|Con vật chậm chạp thường gặp trên lá.|Ốc sên bò trên lá.
cua đồng|🦀 🌾|Loài giáp xác thường gặp ở ruộng.|Cua + đồng lúa.
tôm hùm|🦐 🐯|Loài tôm lớn, tên ghép với tên chúa sơn lâm.|Tôm + hùm, tức hổ.
cá rô|🐟 ♦️|Loài cá quen thuộc, tên trùng một chất bài.|Cá + rô.
ong mật|🐝 🍯|Loài côn trùng làm ra thứ ngọt trong hũ.|Ong + mật.
bướm đêm|🦋 🌙|Loài côn trùng thường xuất hiện khi trời tối.|Bướm + đêm.
đom đóm|🐞 💡|Côn trùng nhỏ phát sáng trong đêm.|Con bọ có ánh sáng: đom đóm.
hoa hồng|🌸 🌹|Loài hoa thường được tặng để bày tỏ tình yêu.|Hoa hồng, gợi từ bông hoa và cành hồng.
hoa sen|🌸 🪷|Loài hoa mọc trong đầm, lá tròn lớn.|Hoa + sen.
hoa hướng dương|🌻 ☀️|Loài hoa có tên chỉ hướng về mặt trời.|Hoa hướng về dương, tức mặt trời.
hoa chuông|🌸 🔔|Loài hoa có dáng giống một nhạc cụ nhỏ.|Hoa + chuông.
hoa giấy|🌸 📄|Hoa mỏng, thường leo thành giàn.|Hoa + giấy.
hoa súng|🌸 🔫|Loài hoa sống trên mặt nước, tên trùng một đồ vật.|Hoa + súng.
cây thông|🌲 🎄|Loài cây thường được trang trí vào Giáng sinh.|Dáng cây và cây Noel đều gợi cây thông.
cây xương rồng|🦴 🐉|Loài cây nhiều gai, chịu hạn tốt.|Xương + rồng, thêm từ cây.
lá phong|🍁 🍃|Chiếc lá nổi tiếng trên quốc kỳ Canada.|Lá có nhiều thùy: lá phong.
quả dứa|🍍 👑|Loại quả có chùm lá như vương miện.|Quả dứa có mắt và chùm lá nhọn.
dưa hấu|🍉 🔴|Quả vỏ xanh, ruột đỏ, nhiều hạt đen.|Miếng dưa và phần ruột đỏ: dưa hấu.
dừa nước|🥥 💧|Loài cây họ cau sống ở vùng ngập nước.|Dừa + nước.
tre trúc|🎋 🎍|Hai tên cây thân đốt thường đi cùng nhau.|Tre và trúc.
măng tre|🎋 🌱|Chồi non ăn được của loài cây thân đốt.|Chồi non của tre là măng tre.
nấm rơm|🍄 🌾|Loại nấm thường được trồng trên phụ phẩm cây lúa.|Nấm + rơm.
rừng mưa|🌳 🌧️|Kiểu rừng có lượng mưa rất lớn.|Rừng + mưa.
nước ngầm|💧 ⬇️|Nguồn nước nằm dưới mặt đất.|Nước ở phía dưới: nước ngầm.
nắng vàng|☀️ 🟨|Ánh mặt trời được ví với một màu ấm.|Nắng + vàng.
`,life:`
xe đạp|🚲 🦶|Phương tiện di chuyển nhờ sức chân.|Xe đi bằng cách đạp.
xe máy|🏍️ ⚙️|Phương tiện hai bánh có động cơ.|Xe + máy.
xe lửa|🚂 🔥|Tên gọi quen thuộc của tàu hỏa.|Xe + lửa.
xe buýt|🚌 🚏|Xe công cộng đón khách ở các trạm.|Xe buýt và trạm dừng.
tàu điện|🚆 ⚡|Phương tiện đường ray dùng điện.|Tàu + điện.
tàu ngầm|🚢 ⬇️ 🌊|Phương tiện có thể đi dưới mặt biển.|Tàu đi ngầm dưới nước.
máy bay|⚙️ 🪽|Phương tiện đưa người đi trên không.|Máy + bay.
khinh khí cầu|🎈 🧺|Phương tiện bay có túi khí lớn và giỏ bên dưới.|Bóng khí nâng chiếc giỏ: khinh khí cầu.
đèn pin|🔦 🔋|Nguồn sáng cầm tay dùng pin.|Đèn + pin.
đèn lồng|🏮 🕯️|Đồ trang trí phát sáng trong đêm Trung thu.|Đèn có khung bao quanh: đèn lồng.
đèn dầu|🪔 🛢️|Nguồn sáng truyền thống dùng nhiên liệu lỏng.|Đèn + dầu.
đèn giao thông|🚦 🚗|Ba màu chỉ dẫn người đi đường.|Đèn điều khiển giao thông.
đồng hồ cát|⏳ 🏖️|Dụng cụ đo thời gian bằng hạt nhỏ.|Đồng hồ + cát.
đồng hồ báo thức|⏰ 🔊|Vật dụng giúp bạn thức dậy đúng giờ.|Đồng hồ phát tiếng báo thức.
kính râm|🕶️ ☀️|Vật dụng bảo vệ mắt khi trời nắng.|Kính râm che ánh nắng.
kính lúp|🔍 🐜|Vật dụng giúp nhìn rõ thứ rất nhỏ.|Kính lúp phóng to con kiến.
kính hiển vi|🔬 🦠|Dụng cụ quan sát vi sinh vật.|Kính hiển vi nhìn những vật cực nhỏ.
kính thiên văn|🔭 ⭐|Dụng cụ quan sát các ngôi sao.|Kính nhìn thiên thể: kính thiên văn.
điện thoại|⚡ ☎️|Thiết bị giúp trò chuyện từ xa.|Điện + thoại, tức lời nói.
điện báo|⚡ 📰|Cách truyền tin bằng tín hiệu điện.|Điện + báo tin.
bàn phím|⌨️ 🔤|Vật dụng để nhập chữ vào máy tính.|Các phím chữ trên bàn phím.
chuột máy tính|🐭 💻|Thiết bị điều khiển con trỏ.|Chuột dùng cho máy tính.
ổ cứng|💾 🪨|Bộ phận lưu trữ dữ liệu lâu dài.|Bộ nhớ lưu dữ liệu và tính chất cứng.
loa kéo|🔊 🧳|Loại loa di động có tay kéo.|Loa + kéo như vali.
quạt giấy|🪭 📄|Vật dụng làm mát gấp từ tờ mỏng.|Quạt + giấy.
thuyền giấy|⛵ 📄|Món đồ chơi gấp có thể thả nổi.|Thuyền + giấy.
máy ảnh|📷 🖼️|Thiết bị ghi lại những khoảnh khắc.|Máy tạo ra ảnh.
khung ảnh|🖼️ 📸|Đồ vật bao quanh một tấm hình.|Khung giữ ảnh.
bút chì|✏️ ⚫|Dụng cụ viết có nét xám, tẩy được.|Bút chì để lại nét xám.
bút máy|🖋️ ⚙️|Loại bút có ngòi và bơm mực.|Bút + máy.
mực in|🦑 🖨️|Chất tạo chữ và hình trên giấy.|Mực + in.
sách giáo khoa|📚 🏫|Sách dùng chính thức để học các môn.|Sách học ở nhà trường: sách giáo khoa.
báo giấy|📰 📄|Tin tức được in thành tờ.|Báo + giấy.
hòm thư|📬 ✉️|Nơi bỏ những lá thư gửi đi.|Hòm nhận thư.
chìa khóa|🔑 🔒|Vật dùng để mở một chiếc khóa.|Chìa dùng mở khóa.
khóa kéo|🤐 🧥|Bộ phận đóng mở áo bằng thao tác trượt.|Khóa kéo trên áo.
áo mưa|🧥 🌧️|Trang phục giúp không bị ướt.|Áo + mưa.
áo phao|🦺 🌊|Trang phục hỗ trợ nổi trên nước.|Áo có tác dụng như phao.
áo len|🧥 🧶|Áo ấm được đan từ sợi.|Áo + len.
giày cao gót|👠 📏|Loại giày có phần gót nâng cao.|Giày có gót cao.
mũ bảo hiểm|⛑️ 🛵|Đồ bảo vệ đầu khi đi xe.|Mũ bảo vệ người đi đường.
găng tay|🧤 ✋|Vật dụng bao quanh bàn tay.|Găng + tay.
kem đánh răng|🪥 🦷|Chất làm sạch dùng cùng bàn chải.|Kem để đánh răng.
xà phòng|🧼 🫧|Chất tạo bọt dùng để rửa sạch.|Xà phòng tạo bọt.
nồi cơm điện|🍚 ⚡|Thiết bị nấu món ăn hằng ngày.|Nồi nấu cơm bằng điện.
bếp ga|🔥 🛢️|Thiết bị nấu ăn dùng khí đốt.|Bếp đun bằng ga.
ấm siêu tốc|🫖 ⚡|Vật dụng đun nước bằng điện rất nhanh.|Ấm đun siêu tốc.
bánh mì|🥖 🌾|Món ăn làm từ bột ngũ cốc, thường có vỏ giòn.|Bánh làm từ bột mì.
kem ốc quế|🍦 🐚|Món lạnh đựng trong chiếc vỏ hình nón.|Kem trong ốc quế.
kẹo bông|🍬 ☁️|Món ngọt nhẹ, xốp như một đám mây.|Kẹo mềm như bông.
`,idiom:`
đầu gấu|👤 🐻|Cách gọi người hay bắt nạt, gây gổ.|Đầu + gấu, nghĩa bóng chỉ kẻ hung hăng.
chân thành|🦶 🏯|Đức tính thật lòng, không giả dối.|Chân + thành.
tay trắng|✋ ⚪|Không có tài sản hay vốn liếng.|Tay + trắng.
tay nghề|✋ 🛠️|Khả năng thực hành một công việc.|Tay + nghề.
chân trời|🦶 ☁️|Đường xa nơi đất như gặp bầu trời.|Chân + trời.
chân núi|🦶 ⛰️|Phần thấp nhất của một ngọn núi.|Chân + núi.
miệng núi lửa|👄 🌋|Lỗ mở phía trên một ngọn núi phun dung nham.|Miệng + núi lửa.
mắt bão|👁️ 🌀|Vùng ở trung tâm cơn bão.|Mắt + bão.
tâm điểm|❤️ 📍|Vị trí trung tâm được chú ý.|Tâm + điểm.
trái tim|⬅️ ❤️|Cơ quan bơm máu, cũng tượng trưng tình yêu.|Trái + tim.
đường chân trời|🛣️ 🦶 ☁️|Ranh giới nhìn thấy giữa trời và mặt đất.|Đường + chân + trời.
đường sắt|🛤️ 🔩|Tuyến đi dành cho tàu hỏa.|Đường + sắt.
đường mật|🛣️ 🍯|Lời nói ngọt ngào dễ làm người khác xiêu lòng.|Đường + mật, đều ngọt.
đường dây|🛣️ 🧵|Một tuyến truyền dẫn hoặc mối liên lạc.|Đường + dây.
đá bóng|🪨 ⚽|Môn thể thao dùng chân đưa bóng vào lưới.|Đá + bóng.
đá cầu|🪨 🪶|Trò chơi dùng chân tâng một vật có lông.|Đá + cầu.
đá quý|💎 👑|Khoáng vật đẹp, có giá trị cao.|Đá được quý trọng: đá quý.
vàng bạc|🟨 ⚪ 💍|Hai kim loại thường dùng làm trang sức.|Vàng và bạc.
trăng mật|🌙 🍯|Khoảng thời gian ngọt ngào của vợ chồng mới cưới.|Trăng + mật.
mật khẩu|🍯 👄|Chuỗi ký tự bí mật để đăng nhập.|Mật + khẩu, khẩu là miệng.
mật mã|🍯 🐴|Thông tin được biến đổi để giữ bí mật.|Mật + mã, mã là ngựa.
hải đăng|🌊 🏮|Tháp đèn chỉ đường cho tàu thuyền.|Hải là biển, đăng là đèn.
sơn hà|⛰️ 🏞️|Từ Hán Việt chỉ núi sông, đất nước.|Sơn là núi, hà là sông.
nhật ký|☀️ ✍️|Những điều ghi lại theo ngày.|Nhật là ngày, ký là ghi chép.
học đường|📚 🛣️|Từ chỉ môi trường nhà trường.|Học + đường.
tiền đạo|💰 ➡️ ⚽|Vị trí tấn công trong đội bóng.|Tiền gợi phía trước, đạo gợi hướng tiến công.
hậu vệ|⬅️ 🛡️|Vị trí phòng ngự trong đội bóng.|Hậu ở phía sau, vệ là bảo vệ.
thủ môn|✋ 🚪|Người giữ khung thành.|Thủ gợi giữ bằng tay, môn là cửa.
song hành|✌️ 🚶|Cùng đi bên nhau.|Song là hai, hành là đi.
độc hành|☝️ 🚶|Đi một mình, không có người đồng hành.|Độc là một, hành là đi.
nước mắt|💧 👁️|Giọt chảy ra khi khóc.|Nước + mắt.
nước hoa|💧 🌸|Chất lỏng có hương thơm.|Nước + hoa.
bóng đèn|⚽ 💡|Bộ phận phát sáng của chiếc đèn.|Bóng + đèn.
bóng rổ|⚽ 🧺|Môn thể thao ném bóng vào vòng có lưới.|Bóng + rổ.
bóng bàn|🏓 ⚽|Môn thể thao dùng vợt nhỏ trên một chiếc bàn.|Bóng bàn, gợi bởi vợt và quả bóng.
cầu thủ|🌉 ✋ ⚽|Người thi đấu một môn bóng.|Cầu + thủ, cầu gợi bóng trong thể thao.
cầu vồng|🌈 🌧️|Dải màu xuất hiện trên trời sau mưa.|Cầu vồng hiện lên sau mưa.
bắt cá hai tay|✋ 🐟 🐟 🤚|Thành ngữ chỉ muốn giành lợi từ hai phía.|Hai bàn tay cùng bắt hai con cá.
nước đổ đầu vịt|💧 ⬇️ 🦆|Nói mãi mà người nghe không tiếp thu.|Đổ nước lên đầu vịt, nước trôi đi hết.
ếch ngồi đáy giếng|🐸 🪑 🕳️|Thành ngữ nói về tầm nhìn hạn hẹp.|Ếch ngồi dưới giếng chỉ thấy một khoảng trời nhỏ.
ăn quả nhớ kẻ trồng cây|😋 🍎 🧑‍🌾 🌳|Lời nhắc phải biết ơn người tạo ra thành quả.|Ăn quả thì nhớ người đã trồng cây.
có công mài sắt có ngày nên kim|💪 🔩 🪨 🪡|Kiên trì rồi sẽ thành công.|Mài thanh sắt lâu ngày thành chiếc kim.
đứng núi này trông núi nọ|🧍 ⛰️ 👀 ⛰️|Không bằng lòng với điều mình đang có.|Đang ở một núi lại ngó sang núi khác.
mèo mù vớ cá rán|🐈 🙈 🐟 🍳|Gặp may một cách tình cờ.|Mèo không thấy đường vẫn vớ được cá rán.
chó treo mèo đậy|🐕 ⬆️ 🐈 🫙|Kinh nghiệm cất thức ăn tránh vật nuôi.|Có chó thì treo cao, có mèo thì đậy kín.
đầu voi đuôi chuột|🐘 ➡️ 🐭|Mở đầu lớn nhưng kết thúc nhỏ bé.|Đầu là voi, đuôi lại là chuột.
nhanh như chớp|🏃 ⚡|Rất nhanh, xảy ra trong chớp mắt.|Tốc độ được ví với tia chớp.
chậm như rùa|🐢 ⏳|Di chuyển hoặc làm việc rất chậm.|Chậm như bước đi của rùa.
khỏe như voi|💪 🐘|Có sức lực rất lớn.|Sức khỏe được ví với voi.
im như thóc|🤫 🌾|Hoàn toàn không nói gì.|Im lặng như những hạt thóc.
`};
  const QUESTIONS=Object.entries(blocks).flatMap(([category,text])=>text.trim().split('\n').map((line,i)=>{const [answer,pictures,hint,explanation]=line.split('|');return {id:`${category}-${i+1}`,category,answer,pictures:pictures.split(' '),hint,explanation};}));
  return {QUESTIONS,CATEGORIES:{all:'Tất cả',nature:'Thiên nhiên',life:'Đời sống',idiom:'Từ ghép & thành ngữ'}};
});
