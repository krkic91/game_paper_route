// version v1.0
(function () {
  'use strict';
  const Art = window.ArcadeArt;
  const categories = { arcade: 'Arcade', sport: 'Thể thao', board: 'Bàn cờ', card: 'Bài', social: 'Nhập vai', puzzle: 'Trí tuệ', strategy: 'Chiến thuật' };
  const categoryColors = {
    arcade: '#bdcf91',
    sport: '#91b8bd',
    board: '#d8b491',
    card: '#dc9d89',
    social: '#b5abd0',
    puzzle: '#b7a5d0',
    strategy: '#b0c59a',
  };
  const games = [
    {
      id: 'battleship', title: 'Hải chiến', category: 'board', players: 'Bạn đấu máy', badge: 'MỚI', supports3d: false,
      description: 'Giấu đội tàu, dò mục tiêu và làm chủ mặt biển.', keywords: 'hai chien battleship tàu chiến bắn tọa độ',
      intro: 'Hai hạm đội, một vùng biển bí mật. Xếp tàu của bạn rồi tìm đội tàu đối phương qua từng phát bắn.',
      instructions: ['Xếp đội tàu trên biển của bạn; có thể xoay tàu hoặc dùng cách xếp ngẫu nhiên.', 'Khi đã sẵn sàng, chọn ô trên biển đối phương để bắn. Trúng hoặc trượt đều được đánh dấu.', 'Dựa vào các ô đã bắn để tìm và đánh chìm toàn bộ tàu đối phương trước khi mất hạm đội.', 'Chọn độ khó để thay đổi cách máy dò tìm. Vị trí tàu chưa bị bắn của đối thủ được giữ kín.'],
      variant: 'Bản 2D một người đấu máy, chơi tại chỗ. Không cần kết nối máy chủ.',
    },
    {
      id: 'minesweeper', title: 'Dò mìn', category: 'puzzle', players: '1 người', badge: 'MỚI', supports3d: false,
      description: 'Đọc những con số, tìm lối đi an toàn.', keywords: 'do min minesweeper logic cắm cờ suy luận',
      intro: 'Mỗi con số cho biết số mìn xung quanh. Mở các ô an toàn và đánh dấu những vị trí bạn đã suy luận ra.',
      instructions: ['Chạm ô để mở. Số trong ô là số mìn ở tám ô xung quanh.', 'Dùng chế độ Cắm cờ trên điện thoại, hoặc nhấp phải trên máy tính.', 'Mở hết các ô không có mìn để thắng. Ô mở đầu an toàn; bàn được kiểm tra giải bằng suy luận.', 'Chọn một trong ba mức khó hoặc thử thách ngày. Tạm dừng cũng dừng đồng hồ.'],
      variant: 'Ba kích thước bàn, sinh đề có kiểm chứng suy luận. Thử thách ngày dùng ngày hiển thị trên thiết bị.',
    },
    {
      id: 'tower', title: 'Thủ thành', category: 'strategy', players: '1 người', badge: 'MỚI', supports3d: false,
      description: 'Dựng tháp, giữ đường và chặn từng đợt quái.', keywords: 'thu thanh tower defense phòng thủ xây tháp quái boss',
      intro: 'Chọn vị trí xây tháp và phối hợp các loại vũ khí. Mỗi đợt quái là một bài toán mới về tầm bắn và ngân quỹ.',
      instructions: ['Chọn bản đồ, chọn vị trí xây rồi chọn loại tháp phù hợp với số xu đang có.', 'Tháp tên, băng và pháo có vai trò khác nhau. Chọn tháp để xem, nâng cấp hoặc bán.', 'Bấm bắt đầu đợt khi đã chuẩn bị xong. Hạ quái nhận xu; quái lọt đường làm mất mạng.', 'Vượt qua 12 đợt để thắng. Có thể đổi tốc độ và tạm dừng để quan sát.'],
      variant: 'Ba bản đồ, đường đi cố định và 12 đợt quái. Xu chỉ dùng để xây dựng trong ván.',
    },
    {
      id: 'onet', title: 'Nối thú', category: 'puzzle', players: '1 người', badge: 'MỚI', supports3d: false,
      description: 'Tìm một cặp, nối một đường, dọn sạch bàn.', keywords: 'noi thu onet nối hình ghép cặp thú',
      intro: 'Các cặp thú đang chờ được nối lại. Tìm đường đi qua khoảng trống để dọn sạch bàn trước khi hết giờ.',
      instructions: ['Chọn hai hình giống nhau. Đường nối đi ngang/dọc và rẽ tối đa hai lần.', 'Đường có thể vòng ra ngoài mép bàn nhưng không đi xuyên ô còn hình hoặc ô bị chặn.', 'Dùng gợi ý hoặc xáo trộn khi cần. Theo dõi mục tiêu và ô khóa ở mỗi màn.', 'Dọn hết các cặp để qua màn; thời gian và bố trí thay đổi theo độ khó.'],
      variant: '24 cấp, ba kích thước bàn, ô đóng băng, gợi ý, xáo trộn và thử thách thời gian.',
    },
    {
      id: 'blocks', title: 'Xếp gạch rơi', category: 'arcade', players: '1 người', badge: 'MỚI', supports3d: false,
      description: 'Xoay đúng khối, lấp đầy hàng và nối combo.', keywords: 'xep gach roi blocks tetris khối xếp hình',
      intro: 'Các khối rơi nhanh dần. Sắp xếp khoảng trống, giữ một khối để dành và hoàn thành nhiều hàng cùng lúc.',
      instructions: ['Di chuyển và xoay khối bằng bàn phím hoặc các nút cảm ứng trên màn hình.', 'Bóng mờ cho biết vị trí đáp. Dùng thả nhanh để đặt khối ngay.', 'Có thể giữ một khối để dùng sau. Xếp kín hàng ngang để xóa hàng và ghi điểm.', 'Liên tiếp xóa hàng tạo combo. Ván kết thúc khi không còn chỗ cho khối mới.'],
      variant: 'Bản xếp khối 2D, túi bảy loại khối, giữ khối, bóng vị trí rơi và tốc độ tăng dần.',
    },
    {
      id: 'reversi', title: 'Cờ lật', category: 'board', players: '1–2 người', badge: 'MỚI', supports3d: false,
      description: 'Kẹp một hàng quân, đổi thế cả bàn cờ.', keywords: 'co lat reversi othello đen trắng chiến thuật',
      intro: 'Mỗi nước đặt quân có thể lật ngược thế trận. Giữ góc, hạn chế nước của đối phương và giành nhiều quân khi kết thúc.',
      instructions: ['Đặt quân vào ô trống để kẹp quân đối phương giữa quân mới và quân của bạn.', 'Các quân bị kẹp theo hàng ngang, dọc hoặc chéo sẽ đổi màu.', 'Không có nước hợp lệ phải bỏ lượt. Khi cả hai cùng hết nước, bên nhiều quân hơn thắng.', 'Chọn đấu máy hoặc hai người cùng thiết bị. Dùng gợi ý để xem nước đi và lý do.'],
      variant: 'Luật Othello trên bàn 8 × 8, có bỏ lượt, hòa và nhiều mức máy.',
    },
    {
      id: 'jungle', title: 'Cờ Thú', category: 'board', players: '1–2 người', badge: 'MỚI', supports3d: false,
      description: 'Vượt sông, đặt bẫy và tiến vào hang đối thủ.', keywords: 'co thu jungle dou shou qi động vật chuột voi hổ sư tử',
      intro: 'Tám loài thú với sức mạnh và khả năng riêng. Phối hợp địa hình để mở đường vào hang đối phương.',
      instructions: ['Chọn một quân rồi chọn ô được đánh dấu để đi hoặc bắt quân.', 'Quân mạnh bắt quân yếu hoặc bằng cấp; Chuột và Voi có quy tắc đặc biệt.', 'Chuột có thể xuống sông. Hổ và Sư tử nhảy qua sông nếu không có Chuột chắn đường.', 'Vào hang đối thủ hoặc khiến đối thủ hết nước hợp lệ để thắng. Xem luật trong game để hiểu bẫy và bắt quân ở bờ nước.'],
      variant: 'Bàn 7 × 9, đấu máy hoặc hai người cùng thiết bị. Luật cấp thú, sông, bẫy và hòa được ghi rõ trong game.',
    },
    {
      id: 'delivery',
      title: 'Delivery Dash',
      category: 'arcade',
      players: '1 người',
      badge: 'NGUYÊN BẢN',
      description: 'Một chiếc xe đạp, cả khu phố đợi bạn.',
      keywords: 'giao báo xe đạp paperboy game cũ',
      intro:
        'Trở lại con phố quen với chiếc xe đạp và một túi báo. Giao thật chuẩn, né thật khéo và về đích an toàn.',
      instructions: [
        'A / D hoặc ← / → để lái. W / S hoặc ↑ / ↓ để tăng, giảm tốc.',
        'Space để ném báo vào mục tiêu. J ném trái, K ném phải. Mỗi lần giao đúng được 100 điểm.',
        'Trên điện thoại: kéo mặt đường để lái, chạm để ném, giữ ĐẠP XE để tăng tốc.',
        'Giữ ít nhất 1 trong 3 mạng để hoàn thành tuyến đường.',
      ],
      variant: 'Giữ nguyên game gốc: 24 hộp thư, 36 tờ báo và chặng chướng ngại cuối đường.',
    },
    {
      id: 'race',
      title: 'Đua xe đạp',
      category: 'sport',
      players: '1 người',
      badge: 'NƯỚC RÚT NÀO',
      description: 'Ôm cua, vượt đồi và bứt tốc cùng đoàn đua.',
      keywords: 'bicycle racing đua tốc độ',
      intro:
        'Cùng 3 đối thủ chinh phục 1 km qua đường cua, dốc và những đoạn đường ướt. Giữ sức bằng cách núp gió, chọn thời điểm để vượt lên.',
      instructions: [
        'Dùng A / D, ← / → hoặc giữ các nút trái, phải để lái.',
        'Xe tự đạp đều. Giữ Space, W, ↑, Shift hoặc nút Nước rút để tăng tốc; thả ra để hồi năng lượng.',
        'Giữ S / ↓ hoặc nút Phanh để giảm tốc. Giữ C hoặc nút Thả trôi để nghỉ đạp; xe vẫn trôi theo quán tính.',
        'Bám sau đối thủ để núp gió và tiết kiệm sức. Lái nhẹ trên đường ướt, đường sỏi và giảm tốc trước chướng ngại.',
        'Chạm cọc làm hỏng xe; vũng nước giảm độ bám, chạm tay đua gây chao xe. Nhặt chai nước để hồi năng lượng. Xe có 3 điểm chịu va chạm.',
      ],
      variant:
        'Đua 2D hoặc 3D với 3 đối thủ biết né, vượt và giữ sức. Có âm thanh và tùy chọn giảm rung camera.',
    },
    {
      id: 'caro',
      title: 'Caro',
      category: 'board',
      players: '1–2 người',
      badge: '',
      description: 'Năm nước thẳng hàng, một chiến thắng.',
      keywords: 'gomoku x o cờ trí tuệ chiến thuật',
      intro:
        'Một bàn cờ, hai ký hiệu và vô số chiến thuật. Tìm nước thắng trước khi đối thủ nhận ra!',
      instructions: [
        'Chọn Đấu với máy, 2 người cùng máy hoặc Chơi online. X luôn đi trước; khi đấu máy, ô “Đi trước” chọn bạn hay máy cầm X.',
        'Online: tạo phòng rồi gửi mã hoặc link mời. Cả hai chọn Sẵn sàng để bắt đầu.',
        'Nhấn một ô trống để đặt quân. Có thể dùng mũi tên trên bàn và Enter để đánh.',
        'Nối từ 5 quân cùng loại liên tiếp theo hàng ngang, dọc hoặc chéo để thắng.',
        'Ván đấu hòa khi bàn kín mà không bên nào thắng.',
        'Online tự kết nối lại và giữ chỗ 90 giây. Sau ván, cả hai chọn Chơi tiếp để đổi X/O.',
      ],
      variant:
        'Caro tự do 15 × 15: từ 5 quân là thắng, kể cả bị chặn hai đầu. Không áp dụng luật cấm của Renju.',
    },
    {
      id: 'chess',
      title: 'Cờ vua',
      category: 'board',
      players: '1–2 người',
      supports3d: false,
      badge: 'MỚI',
      description: 'Tính một nước, mở cả thế cờ.',
      keywords: 'chess cờ vua quốc tế vua hậu xe tượng mã tốt chiến thuật',
      intro: 'Một bàn cờ 64 ô và cuộc đấu trí giữa hai đội quân. Phát triển quân, bảo vệ vua và tìm nước chiếu hết.',
      instructions: [
        'Chọn Đấu với máy hoặc 2 người cùng máy. Trắng đi trước; khi đấu máy, ô “Đi trước” chọn bạn hay máy cầm Trắng (bàn tự xoay để quân của bạn ở dưới).',
        'Chạm quân của bên đang đi rồi chọn ô được đánh dấu. Mũi tên chọn ô, Enter hoặc Space để thao tác.',
        'Không được để vua bị chiếu. Chiếu hết là thắng; không còn nước hợp lệ nhưng không bị chiếu là hòa.',
        'Có nhập thành, bắt tốt qua đường và phong cấp thành Hậu, Xe, Tượng hoặc Mã. Chọn vua rồi ô cách hai cột để nhập thành.',
        'Hoàn tác lùi một nước ở chế độ 2 người, hoặc lùi cả lượt bạn và máy. Lật bàn đổi góc nhìn.',
        'Tự hòa khi lặp thế ba lần, đủ 50 lượt mỗi bên không đi tốt/ăn quân hoặc các trường hợp thiếu quân cơ bản.',
      ],
      variant: 'Cờ vua 2D không đồng hồ, chơi tại chỗ. Có máy Dễ/Vừa. Lặp thế ba lần và luật 50 nước được xử hòa tự động; chưa có yêu cầu hòa, phân xử mọi thế cờ chết hoặc luật thi đấu có trọng tài. Tải lại trang bắt đầu ván mới.',
    },
    {
      id: 'xiangqi',
      title: 'Cờ tướng',
      category: 'board',
      players: '1–2 người',
      supports3d: false,
      badge: 'MỚI',
      description: 'Qua sông, bày thế, tìm đường chiếu bí.',
      keywords: 'xiangqi cờ tướng trung hoa tướng sĩ tượng xe pháo mã tốt chốt',
      intro: 'Đỏ và Đen đối đầu trên bàn cờ có sông và cung tướng. Phối hợp xe, pháo, mã để khóa đường lui của đối thủ.',
      instructions: [
        'Chọn Đấu với máy hoặc 2 người cùng máy. Đỏ đi trước; khi đấu máy, ô “Đi trước” chọn bạn hay máy cầm Đỏ (bàn tự xoay để quân của bạn ở dưới).',
        'Chạm quân rồi chạm giao điểm được đánh dấu. Mũi tên chọn điểm, Enter hoặc Space để đi quân.',
        'Tướng và Sĩ ở trong cung; Tượng không qua sông và bị cản mắt. Mã bị cản chân. Hai tướng không được đối mặt trên cột trống.',
        'Pháo đi như Xe khi không ăn; phải có đúng một quân làm ngòi khi ăn. Tốt chỉ tiến; qua sông được đi ngang, không đi lùi.',
        'Chiếu bí hoặc khiến đối thủ không còn nước đi hợp lệ đều thắng. Mỗi lượt phải giải được chiếu.',
        'Dùng Hoàn tác để lùi nước, Lật bàn để đổi góc nhìn. Có chú giải tên tiếng Việt của các quân.',
      ],
      variant: 'Cờ tướng 2D không đồng hồ, chơi tại chỗ với máy Dễ/Vừa hoặc hai người. Lặp thế ba lần tự hòa; chưa phân xử chiếu dai/đuổi dai theo luật giải đấu. Tải lại trang bắt đầu ván mới.',
    },
    {
      id: 'ludo',
      title: 'Cờ cá ngựa',
      category: 'board',
      players: '1–4 người',
      badge: 'VUI CÙNG BẠN',
      description: 'Tung xúc xắc, đưa cả đội về nhà.',
      keywords: 'ludo xúc xắc cờ ngựa nhiều người',
      intro:
        'Xúc xắc đã sẵn sàng. Xuất chuồng, đá ngựa đối thủ và đưa 4 chú ngựa của bạn về đích trước nhất.',
      instructions: [
        'Chơi Bạn + 3 máy, 2 người hoặc 4 người trên cùng thiết bị. Bạn là đội Xanh lá khi đấu máy.',
        'Ra 6 để đưa ngựa từ chuồng ra điểm xuất phát. Sau khi tung, chạm một ngựa đang sáng để đi.',
        'Ra 6 được thêm lượt. Đáp lên đối thủ để đá về chuồng; ô có ngôi sao là vùng an toàn.',
        'Đi hết vòng rồi vào đường màu của mình. Cần đúng số bước để vào ô đích số 6. Về đủ 4 ngựa là thắng.',
      ],
      variant:
        'Phiên bản Ludo rút gọn: cho phép xếp chồng quân; không chặn đường, không phạt ba lần ra 6. Máy tự đi sau một nhịp chờ.',
    },
    {
      id: 'quan',
      title: 'Ô ăn quan',
      category: 'board',
      players: '1–2 người',
      badge: '',
      description: 'Nhặt một nắm tuổi thơ, rải một vòng vui.',
      keywords: 'o an quan dân gian mancala sỏi quan',
      intro:
        'Trò chơi dân gian thân thuộc trở lại trên màn hình. Quan sát, tính toán và chọn hướng rải thật khéo.',
      instructions: [
        'Bạn / Người 1 chơi hàng dưới. Chọn một ô dân có quân ở hàng của mình, rồi bấm mũi tên ◀ ▶ hiện trên ô để rải. Phím tắt: 1–5 chọn ô, ← → rải, Esc bỏ chọn.',
        'Rải mỗi ô 1 dân theo hướng đã chọn. Gặp ô dân có quân kế tiếp thì nhấc lên và rải tiếp; không nhấc ô quan.',
        'Gặp một ô trống rồi đến ô có quân: ăn ô có quân. Có thể ăn liên tiếp nếu tiếp tục xen kẽ trống – có quân. Quan = 10 điểm, dân = 1 điểm.',
        'Hàng của người sắp đi trống: trả 5 điểm để rải lại mỗi ô 1 dân. Hai ô quan trống hẳn: thu dân hàng mình, ai nhiều điểm hơn thắng.',
        'Nút “Luật chơi” bật thêm luật tùy chọn: quan non, cách xử lý khi thiếu điểm (điểm âm / vay đối thủ / kết thúc ván) và ô quan trống có chặn lượt hay không.',
      ],
      variant:
        'Mặc định dùng luật cơ bản: không quan non, thiếu điểm thì cho điểm âm. Chọn “Đi trước” để bạn hoặc máy đi nước đầu. Máy có 3 mức Dễ / Thường / Khó; hoặc chọn 2 người để chơi chung thiết bị.',
    },
    {
      id: 'domino',
      title: 'Domino',
      category: 'board',
      players: 'Bạn + 3 máy',
      supports3d: false,
      badge: 'MỚI',
      description: 'Nối hai đầu, giữ đường đi, hết quân trước.',
      keywords: 'domino đô mi nô nối quân chấm block',
      intro: 'Bốn người và 28 quân domino. Quan sát hai đầu dãy, tính những quân còn lại và tìm cách mở đường cho mình.',
      instructions: [
        'Mỗi người nhận 7 quân. Người có quân đôi lớn nhất mở đầu; không còn chồng rút.',
        'Chọn một quân có số chấm khớp với đầu trái hoặc phải. Khi khớp cả hai đầu, chọn phía muốn nối.',
        'Chỉ được bỏ lượt khi không có quân hợp lệ. Các đối thủ máy tự đánh khi đến lượt.',
        'Hết quân trước là thắng. Nếu cả bốn người đều bí, ai còn ít tổng chấm nhất thắng; bằng nhau là hòa.',
      ],
      variant: 'Domino chặn, double-six 28 quân, bạn đấu 3 máy. Mỗi ván độc lập; không dùng luật cộng tổng hai đầu kiểu All Fives.',
    },
    {
      id: 'monopoly',
      title: 'Cờ tỷ phú',
      category: 'board',
      players: 'Bạn + 3 máy',
      supports3d: false,
      badge: 'MỚI',
      description: 'Mua một góc phố, xây cả cơ ngơi.',
      keywords: 'monopoly cờ tỷ phú mua đất bất động sản xúc xắc',
      intro: 'Một vòng thành phố với ba đối thủ. Mua đất, thu tiền thuê và cân nhắc nâng cấp để giữ ngân quỹ vững vàng.',
      instructions: [
        'Tung xúc xắc để di chuyển. Ghé đất chưa có chủ để mua hoặc bỏ qua; ghé đất đối thủ phải trả tiền thuê.',
        'Sở hữu trọn nhóm màu để tăng tiền thuê và mở nâng cấp. Xem chi tiết từng ô trước khi quyết định.',
        'Đi qua Xuất phát nhận lương. Các ô Cơ hội, Thuế và Tạm giữ có hiệu ứng riêng được thông báo trong ván.',
        'Thiếu tiền sẽ thanh lý tài sản theo quy ước của bàn. Hết khả năng trả thì phá sản.',
        'Người cuối cùng còn trụ lại thắng. Sau 30 vòng, so tổng tài sản để kết thúc ván.',
      ],
      variant: 'Bản ngắn với 24 ô và địa danh riêng; bạn đấu 3 máy, tối đa 30 vòng. Tiền chỉ dùng trong ván. Không đấu giá, giao dịch giữa người chơi hay thế chấp.',
    },
    {
      id: 'tienlen',
      title: 'Tiến lên miền Nam',
      category: 'card',
      players: 'Bạn + 3 máy',
      supports3d: false,
      badge: 'MỚI',
      description: 'Giữ đôi thông, chờ thời cơ chặt heo.',
      keywords: 'tiến lên miền nam tien len bài 52 lá heo đôi thông tứ quý',
      intro: 'Mười ba lá, nhiều đường đi. Ghép đôi, bộ ba và sảnh để vượt lượt đối thủ và đánh hết bài trước.',
      instructions: [
        'Mỗi người nhận 13 lá. Người giữ 3 bích mở đầu, bộ đánh đầu phải chứa lá này.',
        'Chọn một hoặc nhiều lá rồi bấm Đánh. Chặn bằng bộ cùng loại, cùng số lá và lớn hơn; dùng Gợi ý khi cần.',
        'Thứ tự số: 3 đến A rồi 2; chất: bích, chuồn, rô, cơ. Sảnh từ 3 lá liên tiếp và không chứa 2.',
        'Ba đôi thông chặt một heo. Tứ quý chặt một/đôi heo hoặc ba đôi thông. Bốn đôi thông chặt một/đôi heo, ba đôi thông hoặc tứ quý.',
        'Bỏ lượt thì chờ đến vòng mới; ba người bỏ thì người đánh cuối mở vòng. Người hết bài đầu tiên thắng.',
      ],
      variant: 'Bản 4 người đấu máy, mở mỗi ván bằng 3 bích. Không chặt ngoài lượt, tới trắng hay phạt thối; chỉ xét người về nhất. Bộ chặt vẫn phải mạnh hơn khi cùng loại.',
    },
    {
      id: 'xidach',
      title: 'Xì dách',
      category: 'card',
      players: 'Bạn đấu nhà cái',
      supports3d: false,
      badge: 'MỚI',
      description: 'Rút thêm hay dằn? Cân nhắc trước mốc 21.',
      keywords: 'xì dách xi dach xì lát blackjack xì bàn ngũ linh 21',
      intro: 'Đấu với nhà cái bằng những quyết định rút hoặc dằn. Tìm xì bàn, xì dách, ngũ linh và tránh vượt quá 21 điểm.',
      instructions: [
        'Bạn và nhà cái nhận 2 lá. Chọn Rút để thêm bài hoặc Dằn khi đủ điểm.',
        'Lá 2–10 tính đúng số, J/Q/K tính 10. Át được tính linh hoạt theo quy ước hiển thị trong game.',
        'Hai Át là xì bàn; Át và lá 10 điểm là xì dách. Năm lá không vượt 21 là ngũ linh.',
        'Bài thường cần ít nhất 16 điểm để dằn; vượt 21 là quắc. Nhà cái lật bài và xử lý lượt sau bạn.',
      ],
      variant: 'Xì dách đấu nhà cái máy, dùng điểm giải trí. Các quy ước Át, ngũ linh và hòa được ghi rõ trong bàn chơi; không tách bài hay bảo hiểm kiểu blackjack casino.',
    },
    {
      id: 'werewolf',
      title: 'Ma sói',
      category: 'social',
      players: 'Bạn + 7 máy',
      supports3d: false,
      badge: 'MỚI',
      description: 'Lắng nghe ngôi làng, tìm kẻ ẩn trong đêm.',
      keywords: 'ma sói werewolf nhập vai suy luận tiên tri bảo vệ dân làng',
      intro: 'Một ngôi làng tám người và những vai bí mật. Sử dụng năng lực ban đêm, đọc lời khai và bỏ phiếu theo suy luận của bạn.',
      instructions: [
        'Xem vai của mình: Sói, Tiên tri, Bảo vệ hoặc Dân làng. Vai được chia lại mỗi ván.',
        'Ban đêm, Sói chọn nạn nhân, Tiên tri soi một người và Bảo vệ chọn người để cứu. Dân làng chờ đến sáng.',
        'Ban ngày, đọc thông tin công khai và lời bàn luận của các máy rồi bỏ phiếu loại một người.',
        'Dân thắng khi hết Sói. Sói thắng khi số Sói còn sống bằng hoặc nhiều hơn phe Dân.',
      ],
      variant: 'Một người đấu 7 máy, quản trò tự động. Máy thảo luận theo luật và thông tin của vai, không dùng dịch vụ AI bên ngoài. Quy ước bỏ phiếu và năng lực ghi trong game.',
    },
    {
      id: 'uno',
      title: 'UNO',
      category: 'card',
      players: 'Bạn + 3 máy',
      supports3d: false,
      badge: 'MỚI',
      description: 'Đổi màu, đảo chiều, hô UNO và về nhất!',
      keywords: 'uno bài thẻ card đổi màu đảo chiều rút bài skip reverse wild',
      intro: 'Bốn người, bảy lá bài mỗi người. Chọn đúng màu hoặc ký hiệu, dùng lá chức năng đúng lúc và đánh hết bài trước ba đối thủ máy.',
      instructions: [
        'Chạm lá bài cùng màu, cùng số hoặc cùng ký hiệu với lá trên bàn. Lá đổi màu cho phép chọn một trong bốn màu.',
        'Cấm lượt bỏ qua người kế tiếp; Đảo chiều đổi hướng chơi. +2 và +4 buộc người kế tiếp rút bài và mất lượt; không cộng dồn hình phạt.',
        'Chỉ được đánh +4 khi không còn lá nào cùng màu đang chơi. Trò chơi tự kiểm tra điều kiện này.',
        'Rút 1 lá khi cần hoặc khi muốn giữ bài. Sau khi rút, chỉ được đánh lá vừa rút nếu hợp lệ, hoặc chọn Qua lượt.',
        'Khi còn 2 lá, có thể bấm UNO trước khi đánh. Nếu vừa còn 1 lá, hãy hô UNO trước khi máy hành động; quên hô sẽ bị bắt lỗi và rút thêm 2 lá.',
        'Đánh hết bài để thắng ván. Điểm bằng tổng bài còn lại của ba đối thủ: lá số theo số, lá chức năng 20, đổi màu và +4 là 50.',
      ],
      variant: 'Bản 2D chơi tại chỗ: bạn đấu 3 máy, bộ 108 lá, 7 lá mỗi người. Bạn đi trước trên một lá số; mỗi ván tính riêng. Không cộng dồn +2/+4, không chen lượt, không thách thức +4 vì lá sai luật bị chặn. Tải lại trang bắt đầu ván mới.',
    },
    {
      id: 'pool',
      title: 'Bida bỏ túi',
      category: 'sport',
      players: '1 người',
      badge: '',
      description: 'Ngắm một đường, đánh một cú thật êm.',
      keywords: 'billiards billiard bi da bi-a pool bida',
      intro: 'Một bàn nỉ xanh và 15 bi màu. Thả lỏng tay, căn đúng góc và tận hưởng từng cú đánh.',
      instructions: [
        'Di chuột hoặc chạm bàn để chọn hướng ngắm từ bi trắng. Đường chấm gợi ý đường đi.',
        'Chỉnh thanh Lực đánh, rồi nhấn Đánh bi. Chờ bi dừng hẳn trước cú tiếp theo.',
        'Bàn phím: ← / → chỉnh góc, ↑ / ↓ chỉnh lực, Space đánh bi.',
        'Bi màu vào lỗ: +100 điểm; mỗi cú đánh: −5. Bi trắng vào lỗ: −50 và được đặt lại. Dọn đủ 15 bi nhận thêm 500 điểm.',
      ],
      variant:
        'Chế độ luyện tập bida 6 lỗ, không phải luật 8-ball. Bi đen cũng là bi mục tiêu, có thể đánh vào lỗ bất kỳ lúc nào.',
    },
    {
      id: 'snake',
      title: 'Rắn săn mồi',
      category: 'arcade',
      players: '1 người',
      badge: 'TUỔI THƠ ĐÂY RỒI',
      description: 'Một trái nữa thôi… rồi lại một trái nữa.',
      keywords: 'snake rắn trái cây cổ điển',
      intro:
        'Chú rắn nhỏ có một chiếc bụng không đáy. Ăn nhiều hơn, dài hơn và khéo léo hơn qua từng nước đi.',
      instructions: [
        'Dùng phím mũi tên hoặc W A S D để đổi hướng.',
        'Trên điện thoại: vuốt mặt bàn hoặc nhấn các nút điều hướng.',
        'Mỗi trái cây được 10 điểm. Rắn lớn lên và di chuyển nhanh hơn.',
        'Không chạm tường, không cắn thân mình. Không thể quay đầu 180° ngay lập tức.',
      ],
      variant: 'Bàn 20 × 20 có tường. Kỷ lục được lưu tự động trên thiết bị này.',
    },
    {
      id: '2048',
      title: '2048',
      category: 'puzzle',
      players: '1 người',
      badge: '',
      description: 'Những con số nhỏ, một mục tiêu lớn.',
      keywords: '2048 ghép số giải đố logic',
      intro: 'Trượt, gộp và tính xa hơn một nước. Liệu bạn có chạm được con số 2048?',
      instructions: [
        'Dùng mũi tên, W A S D, các nút bên dưới hoặc vuốt mặt bàn.',
        'Các ô cùng số chạm nhau sẽ gộp lại. Một ô chỉ gộp một lần trong mỗi nước đi.',
        'Sau mỗi nước hợp lệ, một ô 2 hoặc 4 mới xuất hiện. Số vừa gộp được cộng vào điểm.',
        'Đạt 2048 vẫn có thể chơi tiếp. Ván kết thúc khi không còn nước đi hợp lệ.',
      ],
      variant: 'Bàn 4 × 4 cổ điển. Mẹo nhỏ: giữ ô lớn nhất ở một góc và dành chỗ cho những ô mới.',
    },
    {
      id: 'sudoku',
      title: 'Sudoku',
      category: 'puzzle',
      players: '1 người',
      supports3d: false,
      badge: 'MỚI',
      description: 'Chín con số, một khoảng lặng để suy nghĩ.',
      keywords: 'sudoku giải đố số logic 9x9 ghi chú',
      intro: 'Điền những ô còn thiếu, tìm trật tự trong từng hàng và tận hưởng cảm giác giải được một đề khó.',
      instructions: [
        'Mỗi hàng, cột và khối 3 × 3 phải có đủ số 1 đến 9, không lặp lại. Các số cho sẵn không thể sửa.',
        'Chạm ô rồi chọn số bên dưới, hoặc dùng phím 1–9. Mũi tên di chuyển; Delete / Backspace xóa số.',
        'Bật Ghi chú hoặc nhấn N để đánh dấu các số có thể điền. Hoàn tác quay lại thao tác trước.',
        'Kiểm tra đánh dấu số chưa đúng. Gợi ý điền một ô theo đáp án; dùng hỗ trợ sẽ giảm điểm cuối ván.',
        'Chọn Dễ, Vừa hoặc Khó. Tiến độ tự lưu trên trình duyệt; Chơi lại tạo đề mới ở mức đang chọn.',
      ],
      variant: 'Sudoku cổ điển 9 × 9, mỗi đề có một đáp án. Độ khó thay đổi theo số ô cho sẵn. Điểm cơ bản 1.000 / 1.500 / 2.000, trừ 100 mỗi gợi ý, 25 mỗi lần kiểm tra và 1 mỗi 10 giây; tối thiểu 100.',
    },
    {
      id: 'puppies',
      title: 'Xếp cún',
      category: 'puzzle',
      players: '1 người',
      supports3d: false,
      badge: 'MỚI',
      description: 'Mỗi vùng một cún, tìm đúng chỗ cho cả đàn.',
      keywords: 'xếp cún chó puppy dog queens vùng màu giải đố logic',
      intro: 'Những chú cún đang tìm chỗ trong khu vườn nhiều màu. Quan sát các vùng, đánh dấu ô loại trừ và tìm vị trí cho cả đàn.',
      instructions: [
        'Mỗi hàng, mỗi cột và mỗi vùng màu phải có đúng một cún.',
        'Hai cún không được nằm sát nhau, kể cả chéo góc. Cún có thể cùng đường chéo nếu cách xa nhau.',
        'Chọn Đặt cún hoặc Đánh dấu × rồi chạm một ô. Chạm cún đã đặt để lấy lại. Tắt Tự đánh dấu × để chơi khó hơn và tự loại trừ các ô.',
        'Có 3 chiếc xương mỗi màn. Đặt cún sai đáp án mất 1 xương; đánh dấu × không mất xương.',
        'Dùng Hoàn tác, Gợi ý hoặc bật Ký hiệu vùng để phân biệt màu. Mũi tên chọn ô, Enter đặt, phím X đổi chế độ.',
        'Giải xong để sang màn tiếp theo. Mỗi cấp có 5 đề khác cấu trúc; chơi lại liên tiếp dùng hết 5 đề trước khi lặp. Tải lại trang tiếp tục đúng ván đã lưu.',
      ],
      variant: '100 cấp nâng cấp từ 7 × 7 đến 10 × 10, gồm 500 đề khác cấu trúc. Các vùng cân đối hơn, mỗi vùng ít nhất 3 ô và mỗi đề có một đáp án. Cấp sau tăng độ khó suy luận; chơi lại chọn đề khác cùng mức khó, xoay/lật và đổi màu. Có 3 xương mỗi ván; hoàn tác không hoàn lại xương hoặc lượt gợi ý.',
    },
    {
      id: 'memory',
      title: 'Lật thẻ trí nhớ',
      category: 'puzzle',
      players: '1 người',
      badge: '',
      description: 'Lật một tấm thẻ, tìm một người bạn.',
      keywords: 'memory matching lật hình tìm cặp hoa quả',
      intro:
        'Một khu vườn trái cây đang trốn sau những tấm thẻ. Tìm đủ các cặp bằng trí nhớ của bạn.',
      instructions: [
        'Lật hai thẻ bất kỳ. Hai hình giống nhau sẽ được giữ ngửa.',
        'Nếu không khớp, thẻ tự úp sau một nhịp ngắn. Ghi nhớ vị trí nhé!',
        'Tìm đủ 8 cặp để hoàn thành. Đồng hồ chỉ bắt đầu sau lần lật đầu tiên.',
        'Ít lần lật và ít thời gian hơn sẽ được điểm cao hơn.',
      ],
      variant:
        '16 thẻ, 8 cặp trái cây; trộn lại mỗi ván. Điểm = 1.600 − 30 × lần lật − 2 × giây, tối thiểu 100.',
    },
    {
      id: 'breakout',
      title: 'Phá gạch',
      category: 'arcade',
      players: '1 người',
      badge: '',
      description: 'Đỡ bóng thật khéo, dọn sạch bầu trời.',
      keywords: 'breakout arkanoid bóng phá gạch cổ điển',
      intro: 'Giữ quả bóng trong cuộc chơi và biến bức tường gạch thành một cơn mưa điểm số.',
      instructions: [
        'Di chuột, kéo trên bàn hoặc dùng A / D, ← / → để di chuyển thanh đỡ.',
        'Nhấn Phóng bóng, Space hoặc chạm bàn để đưa bóng vào cuộc sau khi mất mạng.',
        'Mỗi viên gạch vỡ được 10 điểm. Bạn có 3 mạng để phá đủ 50 viên.',
        'Bóng đập vào mép thanh đỡ sẽ bật theo góc rộng hơn.',
      ],
      variant:
        'Một màn arcade cổ điển với tốc độ bóng tăng dần. Có nút trái, phải để chơi trên điện thoại.',
    },
  ];
  const ids = new Set(games.map((game) => game.id));
  const storageKey = 'tramchoi.library.v1';
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    stored = {};
  }
  if (typeof stored !== 'object' || Array.isArray(stored)) stored = {};
  const favorites = new Set(
    Array.isArray(stored.favorites) ? stored.favorites.filter((id) => ids.has(id)) : [],
  );
  let recent = Array.isArray(stored.recent)
    ? [...new Set(stored.recent.filter((id) => ids.has(id)))].slice(0, 10)
    : [];
  const records = {}, records3d = {};
  let libraryEdition = stored.edition === '3d' ? '3d' : '2d';
  for (const game of games) {
    for (const [source, destination] of [[stored.records, records], [stored.records3d, records3d]]) {
      if (Number.isFinite(source?.[game.id]) && source[game.id] >= 0)
        destination[game.id] = Math.min(1000000000, Math.floor(source[game.id]));
    }
  }
  let storageWarning = false;
  function save() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ favorites: [...favorites], recent, records, records3d, edition: libraryEdition }),
      );
    } catch {
      if (!storageWarning) {
        storageWarning = true;
        notify('Trình duyệt không cho lưu dữ liệu. Bạn vẫn có thể chơi bình thường.');
      }
    }
  }
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#game-grid'),
    search = $('#search'),
    dialog = $('#player-dialog'),
    stage = $('#game-stage'),
    shell = $('#player-shell'),
    help = $('#game-help');
  const toast = $('#toast');
  let view = 'all',
    filter = 'all',
    sort = 'featured',
    active = null,
    activeEdition = null,
    mountGeneration = 0,
    instance = null,
    paused = false,
    helpVisible = true,
    helpPaused = false,
    opener = null,
    pauseFocus = null,
    toastTimer;
  document.querySelectorAll('[data-icon]').forEach((element) => {
    element.innerHTML = Art.icon(element.dataset.icon);
  });
  $('#hero-art').innerHTML = Art.hero();
  $('#together-art').innerHTML =
    `<svg viewBox="0 0 260 230" aria-hidden="true"><g transform="translate(40 31) rotate(12 90 90)">${Art.ludoBoard()}</g></svg>`;

  function notify(message) {
    clearTimeout(toastTimer);
    (dialog.open ? dialog : document.body).append(toast);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }
  const normalize = (value) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  function filteredGames() {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    const result = games.filter((game) => {
      if (
        (view === 'favorites' && !favorites.has(game.id)) ||
        (view === 'recent' && !recent.includes(game.id))
      )
        return false;
      if (filter !== 'all' && filter !== game.category) return false;
      const haystack = normalize(
        `${game.title} ${game.description} ${game.keywords} ${categories[game.category]}`,
      );
      return words.every((word) => haystack.includes(word));
    });
    if (sort === 'name') result.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    else if (sort === 'recent' || view === 'recent')
      result.sort(
        (a, b) =>
          (recent.includes(a.id) ? recent.indexOf(a.id) : 99) -
          (recent.includes(b.id) ? recent.indexOf(b.id) : 99),
      );
    return result;
  }
  function favoriteButton(game) {
    const saved = favorites.has(game.id);
    return `<button class="favorite-button ${saved ? 'is-favorite' : ''}" data-favorite="${game.id}" aria-label="${saved ? 'Bỏ' : 'Thêm'} ${game.title} ${saved ? 'khỏi' : 'vào'} yêu thích" aria-pressed="${saved}" title="${saved ? 'Bỏ yêu thích' : 'Thêm yêu thích'}">${Art.icon('heart')}</button>`;
  }
  function editionFor(game, requested) {
    return requested === '3d' && game.supports3d !== false ? '3d' : '2d';
  }
  function editionButtons(game) {
    const selected = editionFor(game, libraryEdition);
    return `<div class="card-editions"><button data-play="${game.id}" data-edition="2d" class="${selected === '2d' ? 'selected' : ''}" aria-label="Chơi ${game.title} bản 2D">2D cổ điển</button>${game.supports3d === false ? '' : `<button data-play="${game.id}" data-edition="3d" class="${selected === '3d' ? 'selected' : ''}" aria-label="Chơi ${game.title} bản 3D">${Art.icon('cube', 13)}Chơi 3D</button>`}</div>`;
  }
  function renderLibrary() {
    const visible = filteredGames();
    grid.innerHTML = visible
      .map(
        (game) =>
          `<article class="game-card" data-game="${game.id}"><div class="game-cover"><button class="cover-play" data-play="${game.id}" aria-label="Chơi ${game.title}">${Art.cover(game.id)}<span class="cover-hover"><span>${Art.icon('play')}Chơi ngay</span></span></button>${game.badge ? `<span class="cover-label ${game.id === 'delivery' ? 'original' : ''}">${game.id === 'delivery' ? Art.icon('spark') : ''}${game.badge}</span>` : ''}${favoriteButton(game)}</div><div class="game-card-body"><button class="game-card-title" data-play="${game.id}">${game.title}${Art.icon('arrow-up-right')}</button><p class="game-card-description">${game.description}</p><div class="game-card-meta"><span class="category-tag" style="--tag:${categoryColors[game.category]}"><i></i>${categories[game.category]}</span><span class="players-label">${Art.icon('users')}${game.players}</span></div>${editionButtons(game)}</div></article>`,
      )
      .join('');
    $('#favorite-count').textContent = favorites.size;
    $('#result-count').textContent = visible.length;
    $('#library-title').textContent = search.value.trim()
      ? 'Kết quả tìm kiếm'
      : view === 'favorites'
        ? 'Game yêu thích'
        : view === 'recent'
          ? 'Chơi gần đây'
          : filter === 'all'
            ? 'Tất cả trò chơi'
            : `Game ${categories[filter].toLowerCase()}`;
    $('#breadcrumb-current').textContent =
      view === 'all' ? 'Khám phá' : view === 'favorites' ? 'Yêu thích' : 'Chơi gần đây';
    $('#empty-state').hidden = visible.length > 0;
    const noFavorites = !search.value.trim() && view === 'favorites' && !favorites.size;
    const noRecent = !search.value.trim() && view === 'recent' && !recent.length;
    $('#empty-title').textContent = noFavorites
      ? 'Một góc dành riêng cho game bạn thích'
      : noRecent
        ? 'Cuộc vui đầu tiên đang chờ bạn'
        : 'Chưa tìm thấy game';
    $('#empty-description').textContent = noFavorites
      ? 'Chạm vào trái tim trên một game để lưu vào bộ sưu tập của bạn.'
      : noRecent
        ? 'Mở một game bất kỳ, lần sau bạn sẽ tìm thấy ngay ở đây.'
        : 'Thử một từ khóa khác hoặc chọn thể loại khác nhé.';
    $('#search-announcement').textContent = `${visible.length} game phù hợp.`;
    const exploring = view === 'all' && !search.value.trim();
    $('.welcome').hidden = !exploring;
    $('.highlights').hidden = !exploring;
    $('.surprise-banner').hidden = !exploring;
    $('.dimension-banner').hidden = !exploring;
    document.body.classList.toggle('library-is-3d', libraryEdition === '3d');
    document.querySelectorAll('.edition-switch [data-library-edition]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.libraryEdition === libraryEdition)));
    $('#edition-library-note').textContent = libraryEdition === '3d' ? `${games.filter(game => game.supports3d !== false).length} game có bản 3D · ${games.filter(game => game.supports3d === false).map(game => game.title).join(', ')} chơi 2D` : `${games.length} game · Giữ trọn bản nguyên bản`;
    document.querySelectorAll('[data-view]').forEach((button) => {
      const selected = button.dataset.view === view;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-filter]').forEach((button) => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected);
    });
  }
  function updateHelpFavorite() {
    if (!active) return;
    const button = help.querySelector('[data-help-favorite]');
    if (!button) return;
    const saved = favorites.has(active.id);
    button.classList.toggle('is-favorite', saved);
    button.setAttribute('aria-pressed', saved);
    button.innerHTML = `${Art.icon('heart')}${saved ? 'Đã thêm vào yêu thích' : 'Thêm vào yêu thích'}`;
  }
  function toggleFavorite(id) {
    const game = games.find((game) => game.id === id);
    if (!game) return;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    save();
    renderLibrary();
    updateHelpFavorite();
    notify(
      favorites.has(id)
        ? `Đã thêm ${game.title} vào yêu thích`
        : `Đã bỏ ${game.title} khỏi yêu thích`,
    );
    // Restore focus when the list has been rebuilt, including a disappearing favorite.
    if (!dialog.open)
      (
        grid.querySelector(`[data-favorite="${id}"]`) ||
        grid.querySelector('.favorite-button') ||
        $('#clear-filters')
      ).focus({ preventScroll: true });
  }
  function renderHelp(game) {
    const currentRecords = activeEdition === '3d' ? records3d : records;
    const is3d = activeEdition === '3d';
    help.innerHTML = `<div class="help-cover">${Art.cover(game.id)}</div>${is3d ? '<div class="help-3d-note"><strong>Không gian 3D · WebGL 2</strong><p>Chạm trực tiếp mô hình để chơi. Đổi góc với nút camera; chọn Nhẹ nếu máy chạy chậm. Với bàn cờ / bida: Shift + kéo hoặc chuột phải để xoay.</p><small>Đổi 2D / 3D bắt đầu ván mới. Hai phiên bản lưu kỷ lục riêng.</small></div>' : ''}<h3>Một chút về trò chơi</h3><p>${game.intro}</p><div class="help-label">CHƠI THẾ NÀO?</div><ol>${game.instructions.map((text) => `<li>${text}</li>`).join('')}</ol><p class="help-variant">${game.variant}</p><div class="help-record">${Art.icon('trophy', 28)}<div><small>Kỷ lục ${is3d ? '3D' : '2D'} trên thiết bị này</small><strong id="game-best">${(currentRecords[game.id] || 0).toLocaleString('vi-VN')}</strong><span class="record-unit">điểm</span></div></div><button class="button button-secondary help-favorite" data-help-favorite></button>`;
    updateHelpFavorite();
  }
  function setHelp(value) {
    helpVisible = value;
    shell.classList.toggle('show-help', value);
    shell.classList.toggle('help-hidden', !value);
    $('#help-game').setAttribute('aria-expanded', value);
    if (window.innerWidth <= 800 && !instance?.online) {
      if (value && !paused) {
        helpPaused = true;
        setPaused(true);
      } else if (!value && helpPaused) {
        helpPaused = false;
        setPaused(false);
      }
    }
  }
  function setPaused(value) {
    if (!instance) return;
    if (instance.online && value) return;
    const next = Boolean(value);
    if (next && !paused) pauseFocus = document.activeElement;
    paused = next;
    instance.setPaused?.(paused);
    stage.inert = paused;
    $('#pause-screen').hidden = !paused;
    $('#pause-game').innerHTML = Art.icon(paused ? 'play' : 'pause');
    $('#pause-game').setAttribute('aria-label', paused ? 'Tiếp tục game' : 'Tạm dừng game');
    $('#pause-game').title = paused ? 'Tiếp tục (P)' : 'Tạm dừng (P)';
    if (paused) $('#resume-game').focus({ preventScroll: true });
    else if (pauseFocus?.isConnected && !pauseFocus.disabled)
      pauseFocus.focus({ preventScroll: true });
    else stage.querySelector('.game-workspace')?.focus({ preventScroll: true });
  }
  function restartGame() {
    if (!instance) {
      if (active && activeEdition === '3d') mountGame(active, '3d', true);
      return;
    }
    if (instance.restart() === false) return;
    helpPaused = false;
    setPaused(false);
    (
      stage.querySelector('[data-start]') ||
      stage.querySelector('.three-canvas') ||
      stage.querySelector('.game-workspace') ||
      stage.querySelector('iframe')
    )?.focus({ preventScroll: true });
  }
  function iframeControl(frame, action, value) {
    frame.contentWindow?.postMessage(
      { type: 'tramchoi:control', action, value },
      location.protocol === 'file:' ? '*' : location.origin,
    );
  }
  function onlineActive() {
    return active?.id === 'caro' &&
      (instance?.online || Boolean(window.CaroOnline.getState().session));
  }
  function restoreActiveRoute() {
    if (!active) return;
    const code = active.id === 'caro' ? window.CaroOnline.getState().session?.code : null;
    history.replaceState(null, '', `#play/${active.id}${activeEdition === '3d' ? '/3d' : ''}${code ? `?room=${code}` : ''}`);
  }
  function mayLeaveGame() {
    if (!onlineActive() || window.CaroOnlineUI.confirmLeave()) return true;
    restoreActiveRoute();
    return false;
  }
  function updateOnlineControls() {
    const online = active?.id === 'caro' &&
      stage.querySelector('.game-mode select')?.value === 'online';
    const loading = !instance && activeEdition === '3d';
    shell.classList.toggle('online-game', online);
    $('#pause-game').disabled = online || loading;
    $('#restart-game').disabled = online ? window.CaroOnline.getState().room?.status !== 'finished' : loading;
    $('#restart-game').title = online ? 'Yêu cầu chơi tiếp (R)' : 'Chơi lại (R)';
    $('#restart-game').setAttribute('aria-label', online ? 'Yêu cầu chơi tiếp' : 'Chơi lại game');
    if (online) {
      $('#player-footnote').textContent = 'Phòng online · Đổi 2D/3D giữ nguyên ván';
    } else if (active) {
      $('#player-footnote').textContent = activeEdition === '3d' ? 'WebGL 2 · Kỷ lục 3D riêng · Đổi phiên bản = ván mới' :
        active.id === 'delivery' ? 'Delivery Dash · Game nguyên bản của bạn' : 'Chơi tại chỗ · Kỷ lục lưu trên thiết bị';
    }
    const note = help.querySelector('.help-3d-note small');
    if (note) note.textContent = online ? 'Đổi 2D / 3D giữ nguyên phòng và ván online.' : 'Đổi 2D / 3D bắt đầu ván mới. Hai phiên bản lưu kỷ lục riêng.';
  }
  function show3DError(message) {
    if (!active) return;
    stage.innerHTML = `<div class="three-unavailable"><span class="three-error-icon">${Art.icon('cube', 38)}</span><span class="eyebrow">BẢN 2D VẪN SẴN SÀNG</span><h3>Chưa thể mở không gian 3D</h3><p></p><div><button class="button button-primary" data-play="${active.id}" data-edition="2d">Chơi bản 2D</button><button class="button button-secondary" data-retry-3d>Thử lại 3D</button></div></div>`;
    stage.querySelector('.three-unavailable p').textContent = message;
    $('#pause-game').disabled = true; $('#restart-game').disabled = false;
    stage.querySelector('button').focus({ preventScroll: true });
  }
  async function mountGame(game, edition = '2d', force = false) {
    edition = editionFor(game, edition);
    if (!force && active?.id === game.id && activeEdition === edition && dialog.open) return;
    if (active?.id !== game.id && !mayLeaveGame()) return;
    const token = ++mountGeneration;
    const switching = active?.id === game.id && activeEdition !== edition;
    const preserveOnline = active?.id === 'caro' && game.id === 'caro';
    instance?.destroy({ preserveOnline });
    if (!preserveOnline && active?.id === 'caro') window.CaroOnline.leave();
    if (!dialog.open) opener = document.activeElement;
    active = game; activeEdition = edition; instance = null;
    paused = false; helpPaused = false; pauseFocus = null;
    stage.innerHTML = ''; stage.inert = false; stage.dataset.edition = edition;
    $('#pause-screen').hidden = true;
    $('#pause-game').innerHTML = Art.icon('pause');
    $('#pause-game').setAttribute('aria-label', 'Tạm dừng game');
    $('#pause-game').title = 'Tạm dừng (P)';
    $('#pause-game').disabled = edition === '3d'; $('#restart-game').disabled = edition === '3d';
    $('#player-title').textContent = `${game.title}${edition === '3d' ? ' 3D' : ''}`;
    $('#player-category').textContent = `${categories[game.category]} · ${game.players}`;
    $('#player-footnote').textContent = edition === '3d' ? 'WebGL 2 · Kỷ lục 3D riêng · Đổi phiên bản = ván mới' : game.id === 'delivery' ? 'Delivery Dash · Game nguyên bản của bạn' : 'Chơi tại chỗ · Kỷ lục lưu trên thiết bị';
    document.querySelectorAll('[data-player-edition]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.playerEdition === edition)));
    $('.player-edition-switch').hidden = game.supports3d === false;
    renderHelp(game);
    helpVisible = window.innerWidth > 800;
    shell.classList.toggle('show-help', helpVisible); shell.classList.toggle('help-hidden', !helpVisible);
    $('#help-game').setAttribute('aria-expanded', helpVisible);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
    const currentRecords = edition === '3d' ? records3d : records;
    // Games with configurable rules can describe the active rule set in the help panel.
    const setHelpNote = text => {
      if (token !== mountGeneration) return;
      const note = help.querySelector('.help-variant');
      if (note) note.textContent = text;
    };
    const onScore = score => {
      if (!Number.isFinite(score) || score < 0 || token !== mountGeneration || activeEdition !== edition) return;
      score = Math.floor(score);
      if (score > (currentRecords[game.id] || 0)) {
        currentRecords[game.id] = score; save();
        const record = $('#game-best'); if (record) record.textContent = score.toLocaleString('vi-VN');
      }
    };
    if (edition === '3d') {
      stage.innerHTML = `<div class="three-loading" role="status"><div class="loading-cube">${Art.icon('cube', 52)}</div><span class="eyebrow">THÊM MỘT CHIỀU VUI</span><h3>Đang dựng không gian 3D…</h3><p>Tải mô hình và bộ dựng hình từ dự án của bạn.</p><button class="button button-secondary" data-play="${game.id}" data-edition="2d">Chơi 2D thay thế</button></div>`;
      try {
        await window.Arcade3D.load();
        if (token !== mountGeneration || !dialog.open) return;
        stage.innerHTML = '';
        const settings = { renderer: '3d', best: currentRecords[game.id] || 0, onScore, setHelpNote };
        instance = game.id === 'delivery' ? window.Arcade3D.mountDelivery(stage, settings) : window.ArcadeGames[game.id](stage, settings);
        $('#pause-game').disabled = false; $('#restart-game').disabled = false;
        (stage.querySelector('[data-start]') || stage.querySelector('.three-canvas'))?.focus({ preventScroll: true });
        if (switching) notify(instance?.online ? 'Đã mở bản 3D. Ván online được giữ nguyên.' : 'Đã mở bản 3D — ván mới, kỷ lục riêng.');
        if (document.hidden) setPaused(true);
      } catch (error) {
        if (token !== mountGeneration || !dialog.open) return;
        instance?.destroy({ preserveOnline: game.id === 'caro' }); instance = null;
        show3DError(error.message || 'Không thể khởi tạo đồ họa 3D. Bạn có thể chơi bản 2D.');
      }
    } else if (game.id === 'delivery') {
      const frame = document.createElement('iframe');
      frame.title = 'Delivery Dash — game giao báo nguyên bản'; frame.src = 'delivery.html'; frame.allow = 'fullscreen'; stage.append(frame);
      frame.addEventListener('load', () => { if (token === mountGeneration) iframeControl(frame, 'pause', paused); }, { once: true });
      instance = { frame, onScore, restart: () => iframeControl(frame, 'restart'), setPaused: value => iframeControl(frame, 'pause', value), destroy: () => frame.remove() };
      frame.focus({ preventScroll: true });
    } else {
      try {
        instance = window.ArcadeGames[game.id](stage, { best: currentRecords[game.id] || 0, onScore, setHelpNote });
        (stage.querySelector('[data-start]') || stage.querySelector('[tabindex="0"]') || stage.querySelector('.game-workspace'))?.focus({ preventScroll: true });
      } catch (error) {
        console.error('Không thể mở game:', error);
        stage.innerHTML = '<div class="empty-state"><h3>Chưa mở được game</h3><p>Hãy tải lại trang và thử lại nhé.</p></div>';
        notify('Có lỗi khi mở game. Vui lòng tải lại trang.');
      }
    }
    if (token !== mountGeneration) return;
    updateOnlineControls();
    recent = [game.id, ...recent.filter(id => id !== game.id)].slice(0, 10); save(); renderLibrary();
  }
  function clearGameHash() {
    if (location.hash.startsWith('#play/'))
      history.replaceState(null, '', location.href.split('#')[0]);
  }
  function closeGame(updateHash = true) {
    if (!active && !dialog.open) return;
    if (!mayLeaveGame()) return false;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    const closingId = active?.id;
    mountGeneration++;
    instance?.destroy();
    if (closingId === 'caro') window.CaroOnline.leave();
    instance = null;
    active = null;
    activeEdition = null;
    delete stage.dataset.edition;
    paused = false;
    helpPaused = false;
    stage.inert = false;
    stage.innerHTML = '';
    $('#pause-screen').hidden = true;
    if (dialog.open) dialog.close();
    document.body.classList.remove('modal-open');
    shell.classList.remove('online-game');
    document.body.append(toast);
    if (updateHash) clearGameHash();
    if (opener?.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    else
      (
        grid.querySelector(`[data-game="${closingId}"] .cover-play`) || $('[data-play="delivery"]')
      ).focus({ preventScroll: true });
    return true;
  }
  function playGame(id, edition = libraryEdition, replace = false) {
    if (!ids.has(id)) return;
    edition = editionFor(games.find(game => game.id === id), edition);
    const code = id === 'caro' && active?.id === 'caro' ?
      (window.CaroOnline.getState().session?.code || window.CaroOnline.getInviteCode()) : '';
    const hash = `#play/${id}${edition === '3d' ? '/3d' : ''}${code ? `?room=${encodeURIComponent(code)}` : ''}`;
    if (replace) { history.replaceState(null, '', hash); syncRoute(); }
    else if (location.hash === hash) mountGame(games.find((game) => game.id === id), edition);
    else location.hash = hash;
  }
  function syncRoute() {
    if (!location.hash.startsWith('#play/')) {
      closeGame(false);
      return;
    }
    const route = /^#play\/([^/?]+)(?:\/(2d|3d))?(?:\?.*)?$/.exec(location.hash);
    const id = route?.[1], edition = route?.[2] || '2d';
    const game = games.find((game) => game.id === id);
    if (game) {
      // Changing only the invite hash keeps the same document alive. Apply the
      // new invitation before mountGame's same-game/edition shortcut can skip it.
      const invite = game.id === 'caro' ? window.CaroOnline.getInviteCode() : '';
      const session = window.CaroOnline.getState().session;
      const newInvite = invite && active?.id === 'caro' && dialog.open &&
        (session ? session.code !== invite : !instance?.online ||
          stage.querySelector('[data-online-code]')?.value.trim().toUpperCase() !== invite);
      if (newInvite) {
        if (!mayLeaveGame()) return;
        // Also cancel an in-flight create/join whose seat has not arrived yet.
        window.CaroOnline.leave();
      }
      const supported = editionFor(game, edition);
      if (supported !== edition) history.replaceState(null, '', `#play/${id}`);
      mountGame(game, supported, Boolean(newInvite));
    }
    else {
      if (closeGame(false) === false) return;
      clearGameHash();
      notify('Game này chưa có trong thư viện. Hãy chọn một trò khác nhé.');
    }
  }
  function randomGame() {
    let pool = filteredGames();
    if (!pool.length) pool = games;
    if (pool.length > 1) pool = pool.filter((game) => game.id !== (active?.id || recent[0]));
    playGame(pool[Math.floor(Math.random() * pool.length)].id);
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.brand,.mobile-brand')) {
      event.preventDefault();
      if (closeGame() === false) return;
      view = 'all';
      filter = 'all';
      search.value = '';
      sort = 'featured';
      $('#sort').value = 'featured';
      renderLibrary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const librarySwitch = event.target.closest('[data-library-edition]');
    if (librarySwitch) {
      libraryEdition = librarySwitch.dataset.libraryEdition === '3d' ? '3d' : '2d';
      save(); renderLibrary();
      if (librarySwitch.closest('.dimension-banner')) $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const playerSwitch = event.target.closest('[data-player-edition]');
    if (playerSwitch && active) {
      if (playerSwitch.dataset.playerEdition !== activeEdition) playGame(active.id, playerSwitch.dataset.playerEdition, true);
      return;
    }
    if (event.target.closest('[data-retry-3d]') && active) { mountGame(active, '3d', true); return; }
    const play = event.target.closest('[data-play]');
    if (play) {
      playGame(play.dataset.play, play.dataset.edition || libraryEdition);
      return;
    }
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      toggleFavorite(favorite.dataset.favorite);
      return;
    }
    if (event.target.closest('[data-help-favorite]') && active) {
      toggleFavorite(active.id);
      return;
    }
    if (event.target.closest('[data-random]')) {
      randomGame();
      return;
    }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      view = viewButton.dataset.view;
      filter = 'all';
      search.value = '';
      renderLibrary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
      filter = filterButton.dataset.filter;
      renderLibrary();
      return;
    }
    const category = event.target.closest('[data-category]');
    if (category) {
      view = 'all';
      filter = category.dataset.category;
      search.value = '';
      renderLibrary();
      $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  search.addEventListener('input', renderLibrary);
  $('#sort').addEventListener('change', (event) => {
    sort = event.target.value;
    renderLibrary();
  });
  $('#clear-filters').addEventListener('click', () => {
    view = 'all';
    filter = 'all';
    search.value = '';
    sort = 'featured';
    $('#sort').value = 'featured';
    renderLibrary();
    $('#library').scrollIntoView({ block: 'start' });
  });
  $('#close-game').addEventListener('click', () => closeGame());
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeGame();
  });
  $('#pause-game').addEventListener('click', () => setPaused(!paused));
  $('#resume-game').addEventListener('click', () => setPaused(false));
  $('#restart-game').addEventListener('click', restartGame);
  $('#help-game').addEventListener('click', () => setHelp(!helpVisible));
  $('#fullscreen-game').hidden = !document.fullscreenEnabled;
  $('#fullscreen-game').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      notify('Trình duyệt chưa cho phép toàn màn hình. Bạn vẫn có thể chơi ở cửa sổ này.');
    }
  });
  stage.addEventListener('arcade:3d-lost', () => {
    if (activeEdition !== '3d') return;
    instance?.destroy({ preserveOnline: active?.id === 'caro' }); instance = null; paused = false;
    stage.inert = false; $('#pause-screen').hidden = true;
    show3DError(window.CaroOnline.getState().session && active?.id === 'caro' ?
      'Kết nối với GPU bị gián đoạn. Mở lại 3D hoặc chuyển sang 2D để tiếp tục ván online.' :
      'Kết nối với GPU đã bị gián đoạn. Bạn có thể mở lại bản 3D (ván mới) hoặc chuyển sang 2D.');
  });
  stage.addEventListener('arcade:online-mode', updateOnlineControls);
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (dialog.open) {
      if (window.ArcadeShared.isTyping(event)) return;
      if (key === 'p' && !event.repeat) {
        event.preventDefault();
        setPaused(!paused);
      }
      if (key === 'r' && !event.repeat) {
        event.preventDefault();
        restartGame();
      }
    } else if (
      (key === '/' && !window.ArcadeShared.isTyping(event)) ||
      ((event.ctrlKey || event.metaKey) && key === 'k')
    ) {
      event.preventDefault();
      search.focus();
      search.select();
    } else if (key === 'escape' && document.activeElement === search) {
      search.value = '';
      renderLibrary();
      search.blur();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open && !paused) setPaused(true);
  });
  window.addEventListener('message', (event) => {
    const sameOrigin =
      event.origin === location.origin ||
      (location.protocol === 'file:' && event.origin === 'null');
    if (
      !instance?.frame ||
      event.source !== instance.frame.contentWindow ||
      !sameOrigin ||
      !event.data
    )
      return;
    if (event.data.type === 'tramchoi:score' && active?.id === 'delivery')
      instance.onScore(event.data.score);
    if (event.data.type === 'tramchoi:shortcut') {
      if (event.data.action === 'pause') setPaused(!paused);
      if (event.data.action === 'restart') restartGame();
      if (event.data.action === 'close') closeGame();
    }
  });
  renderLibrary();
  syncRoute();
})();
