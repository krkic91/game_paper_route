<!-- version v1.0 -->
# Cờ lật

Cờ lật (Reversi theo bố trí Othello) dùng bàn 8×8 với bốn quân ở giữa. Có chế độ đấu máy ba mức Dễ / Vừa / Khó và hai người cùng thiết bị. Khi đấu máy, bạn chọn cầm Đen đi trước hoặc Trắng đi sau.

## Luật

Đen đi trước. Mỗi nước đặt một quân vào ô trống và phải kẹp ít nhất một quân đối thủ giữa quân mới và một quân cùng màu theo hàng, cột hoặc đường chéo. Tất cả các chuỗi bị kẹp từ ô vừa đặt đều bị lật. Khoảng trống cắt đứt chuỗi; không lật nối tiếp từ những quân vừa đổi màu.

Nếu bên sắp đi không có nước hợp lệ, hệ thống tự động bỏ lượt và thông báo. Chỉ khi cả hai bên cùng không có nước đi thì ván kết thúc, kể cả bàn chưa đầy. Bên có nhiều quân hơn thắng; bằng nhau hòa. Bản này đếm quân thực tế, không cộng ô trống cho bên thắng, không áp dụng đồng hồ thi đấu.

Luật đối chiếu [World Othello Federation — Official Rules, English](https://www.worldothello.org/about/about-othello/othello-rules/official-rules/english). Tính điểm theo số quân thực tế phù hợp [United States Othello Association — Tournament Rules, §4.1](https://usothello.org/usoa-tournament-rules/).

## Điều khiển

- Chạm/click ô có chấm nhỏ để đi; phím mũi tên chuyển ô, Enter hoặc Space đặt quân.
- **Gợi ý có giải thích** đánh dấu một ô và nêu số quân lật, cơ hội chiếm góc, nguy cơ cho đối thủ góc hoặc số nước họ còn lại. Không tự đánh quân.
- **Đi lại** hoàn tác một nước ở chế độ hai người; khi đấu máy, trả bàn về trước lượt gần nhất của bạn, gồm cả những nước máy đi liên tiếp do bạn bị bỏ lượt. Có thể hủy nước của bạn trong lúc máy đang chờ. Nước mở đầu của máy khi bạn cầm Trắng không thể hoàn tác một mình.
- **Xoay bàn** đổi hướng hiển thị 180°, giữ nguyên tọa độ và trạng thái trận đấu.
- Đổi chế độ, màu quân hoặc độ khó sẽ mở ván mới. Tạm dừng giữ nguyên bàn và thời gian chờ của máy; đóng game hủy toàn bộ lịch chạy của game.

## Máy và kiến trúc

`games/reversi-logic.js` là UMD dùng được trong Node và browser (`ArcadeReversi`). Bàn là mảng 64 ô: `0` trống, `1` Đen, `-1` Trắng. API gồm `createGame`, `flipsAt`, `legalMoves`, `counts`, `play`, `undo`, `chooseMove`, `coordinate`, `explainMove`. Nước không hợp lệ không thay đổi trạng thái; lịch sử lưu ảnh chụp trước mỗi nước để khôi phục cả lượt bỏ qua/kết quả.

Máy dùng minimax alpha-beta, tìm sâu tăng dần và chỉ nhận kết quả của một độ sâu đã tìm xong. Dễ tối đa 1 tầng / 100 nút; Vừa 3 tầng / 1.200 nút; Khó 5 tầng / 6.000 nút. Đánh giá ưu tiên góc, khả năng di chuyển, cạnh bàn và tránh ô sát góc còn trống; cuối ván tăng trọng số số quân. Máy có giới hạn tính toán, không phải máy giải tối ưu hoặc bảo đảm thắng. Toàn bộ trạng thái của Cờ lật là thông tin công khai.

UI dựng bằng DOM/CSS, dùng `ArcadeShared.createScope` cho sự kiện và timer. Quân được phân biệt bằng sáng/tối, nước hợp lệ bằng chấm, nước cuối bằng viền vàng; nút bàn có tên tọa độ/quân cho công cụ hỗ trợ và điều khiển bàn phím. Bàn không dùng biến đổi 3D hay đường viền chung giữa các ô.

## Kiểm thử

`node --test tests/reversi.test.cjs`: vị trí mở đầu, bắt quân tám hướng, chuỗi đứt và mép bàn, hành động sai không thay đổi trạng thái, bỏ lượt, kết thúc sớm, hòa, Đen/Trắng thắng, undo, tính hợp lệ của AI và 200 ván có seed đối chiếu một bộ kiểm tra nước đi độc lập.

`node tests/browser-reversi.cjs`: Chromium và WebKit, mỗi engine một luồng chức năng cùng bốn viewport 320×740, 390×844, 820×1180, 1366×900. Kiểm tra gợi ý, bàn phím, hai người, chọn màu, AI, hoàn tác, xoay bàn, bỏ lượt, kết quả/chơi lại, tạm dừng, đóng khi máy đang chờ, kích thước nút và tràn ngang. Đây là browser headless trên Windows với viewport/touch/DPR mô phỏng, không phải máy ảo hay iPhone/iPad thật.
