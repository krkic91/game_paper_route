# Cờ úp, Cờ gánh, Piano tiles và Ghép hình

Thư viện có 37 game. Cờ úp là biến thể trong Cờ tướng; Cờ gánh, Piano tiles và Ghép hình có thẻ riêng. Tất cả dùng JavaScript/CSS/SVG cục bộ, tải khi mở và hỗ trợ `file://`.

## Cờ úp

Chọn **Cờ tướng → Biến thể → Cờ úp**. Có máy Dễ/Vừa và hai người cùng thiết bị. Mỗi bên giữ Tướng ngửa, xáo 15 quân còn lại. Quân úp đi nước đầu theo vai trò ô xuất phát rồi lật ngay; sau đó đi theo quân thật. Sĩ đã lật được rời cung, Tượng đã lật được qua sông nhưng vẫn bị cản mắt. Tướng giữ luật cung và lộ mặt tướng.

Biến thể tại đây lật công khai cả quân úp bị bắt. Danh tính chưa lật chỉ nằm trong bộ nhớ riêng của luật; giao diện và AI chỉ biết vai trò vị trí xuất phát và các quân đã lật. AI đánh giá trung bình các khả năng còn lại, không xem quân bí mật. Hoàn tác khôi phục đúng quân cũ, không xáo lại. Chiếu bí/bí nước thua; lặp thế ba lần hoặc 120 lượt không bắt/lật tự hòa. Đây là luật chơi tại nhà, không phân xử chiếu dai/đuổi dai như giải đấu.

Tham khảo cách di chuyển: [Xiangqi.com](https://www.xiangqi.com/vn/articles/cach-choi-co-up). Quy tắc công khai quân bị bắt được chọn theo biến thể mô tả tại [Cờ Vũ Môn](https://covumon.com/en/co-up/luat).

## Cờ gánh

Bàn 5 × 5 có 16 quân, 8 mỗi bên, Đỏ đi trước. Đi một bước theo đường nối vào điểm trống. Đi vào giữa một cặp đối thủ trên đường thẳng để **gánh**, đổi màu cả hai. Một nước có thể gánh nhiều cặp. **Vây** đổi cả nhóm quân đối thủ không còn điểm trống kề theo đường nối.

Tùy chọn **Luật mở**: sau nước không đổi quân, nếu điểm vừa bỏ trống nằm giữa một cặp quân của người vừa đi, đối thủ phải vào điểm ấy để gánh khi có quân đi tới được. Tắt tùy chọn để học luật cơ bản. Máy có hai mức, gợi ý và hoàn tác. Chiếm hết quân hoặc khiến đối thủ hết nước là thắng. Giới hạn chơi tại nhà: hòa khi lặp thế ba lần, 80 lượt không đổi màu hoặc 300 lượt tổng.

Tham khảo: [Cờ Làng](https://colang.apphay.net/co-ganh), [hướng dẫn Cờ gánh](https://dangnho.com/kien-thuc-detail/huong-dan-cach-choi-co-ganh-co-chem).

## Piano tiles · Phím đàn

Chạm một trong bốn cột hoặc dùng **D F J K** khi tâm nốt chạm vạch vàng. Có 2 giây chuẩn bị, 3 cơ hội và nhịp 60/90/120 BPM. Cửa sổ đúng nhịp ±220 ms; chuẩn ±80 ms được 100 điểm, đúng được 60. Chuỗi liên tiếp tăng hệ số sau mỗi 10 nốt, tối đa ×4. Chạm sai/bỏ lỡ mất một cơ hội. Tạm dừng giữ thời gian; có nút tắt âm thanh.

Âm thanh được tổng hợp bằng WebAudio, không dùng bản thu hay lời bài hát. Ba giai điệu: đoạn Ode to Joy của Beethoven, giai điệu cổ Ngôi sao nhỏ, và Gió bên hiên viết riêng trong dự án. Có thể chơi bằng hình ảnh khi trình duyệt không hỗ trợ âm thanh.

## Xếp hình jigsaw

Ba tranh SVG vẽ riêng trong `games/jigsaw-art.js`: Hồ sen buổi sớm, Phố đèn lồng và Dưới lòng đại dương. Mỗi tranh có 9, 16 hoặc 25 mảnh có ngàm khớp. Kéo thả hoặc chọn mảnh rồi chạm vị trí; cũng dùng được Tab/Enter. Mảnh đúng khóa tại chỗ, không cần xoay. Không giới hạn thời gian.

Xem ảnh mẫu miễn phí. Hoàn thành được 1.000 điểm trừ 50 mỗi gợi ý, 10 mỗi lần đặt sai, tối thiểu 100. Đổi tranh hoặc kích thước bắt đầu lượt mới.

## Kiểm tra

`npm run test:culture` kiểm tra luật, thông tin bí mật, AI, hoàn tác, nhịp/điểm và các kích thước ghép hình. `npm run test:culture:browser` dùng Playwright/Edge với viewport máy tính, điện thoại 390/320 px và mở trực tiếp `file://`; kiểm tra thao tác, tạm dừng, chơi lại và dọn tài nguyên. Kết quả và ảnh tại `test-results/culture/`. Đây là mô phỏng trình duyệt, không thay thế thử trên thiết bị thật.

Đã chạy ngày 28/10/2026: toàn bộ `npm test` qua 383/383, gồm 17 kiểm thử mới; kiểm tra cú pháp qua. Trình duyệt Edge qua 16 kịch bản của bốn mục này, 10 kịch bản tải thư viện (37 game qua HTTP/file, 10 bản 3D và phục hồi tải lỗi), cùng kiểm thử Cờ vua/Cờ tướng cũ trên máy tính và sáu kích thước màn hình. Chưa kiểm thử WebKit hoặc thiết bị thật trong đợt này.
