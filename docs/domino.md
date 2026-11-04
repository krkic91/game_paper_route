<!-- version v1.0 -->
# Domino

Domino nối quân dành cho một người chơi và ba máy. Trò chơi chạy hoàn toàn trong trình duyệt, không cần tài khoản hoặc mạng; mỗi ván được chia lại ngẫu nhiên.

## Luật của phiên bản này

- Dùng bộ đôi sáu gồm 28 quân, từ 0–0 đến 6–6. Chia hết, mỗi người 7 quân. Không có chồng quân để rút.
- Người giữ 6–6 mở bàn bằng quân đó; lượt tiếp tục qua Bạn → Máy 1 → Máy 2 → Máy 3 rồi quay lại.
- Nối một quân có số trùng với đầu trái hoặc đầu phải. Quân tự xoay cho khớp. Quân đôi vẫn chỉ nối hai đầu, không mở thêm nhánh.
- Chọn quân có viền sáng. Nếu nối được cả hai đầu, chọn nút **Nối trái** hoặc **Nối phải**. Có thể hủy chọn trước khi xác nhận.
- Chỉ được **Bỏ lượt** khi không có quân hợp lệ. Không có rút quân hoặc bỏ lượt tự nguyện.
- Ai đánh hết quân trước thắng ngay. Nếu bốn lượt liên tiếp không ai nối được, người có tổng chấm còn lại thấp nhất thắng. Nếu nhiều người cùng ít chấm nhất, cả ván hòa.
- Người thắng nhận tổng số chấm còn lại của ba người kia. Kỷ lục trong thư viện chỉ ghi điểm khi bạn thắng; hòa và thua là 0 điểm. Đây là ván độc lập, không phải cuộc đấu cộng dồn đến một mốc điểm.

Đây là biến thể **Block Dominoes bốn người chơi riêng**, không phải đấu cặp hoặc All Fives. Tài liệu [hướng dẫn Domino của Mattel](https://service.mattel.com/instruction_sheets/I3664.pdf) là nguồn tham khảo cho cách nối số và xét người thắng khi hết quân hoặc bàn bị chặn. Cách chia hết 7 quân/người, mở bằng đôi cao nhất, xử lý hòa và tính điểm nêu trên là quy ước cụ thể của trò chơi này.

## Giao diện và thao tác

- Mỗi máy chỉ hiển thị số quân còn lại. Máy chọn nước đi từ quân của mình và hai đầu công khai, không đọc quân của đối thủ.
- **Gợi ý nước đi** là nút riêng dưới quân của bạn, chỉ dùng trong lượt của bạn. Chỉ khi bấm mới hiện quân đề xuất, đầu nối và lý do; game chưa đánh quân. Bấm **Đánh theo gợi ý** để xác nhận hoặc **Đóng gợi ý** để tự chọn. Nếu bị chặn, nút xác nhận là **Bỏ lượt theo gợi ý**.
- Gợi ý dùng quân của bạn và hai đầu công khai, không đọc quân kín của máy. Ưu tiên giảm chấm và giữ số có thể nối tiếp; đây không phải bảo đảm thắng. Gợi ý tự xóa khi đánh/bỏ lượt, chọn quân khác hoặc chơi lại; không tự xuất hiện ở lượt tiếp theo.
- Bản 3D vẫn hiển thị số quân đối thủ, hai đầu bàn và các nút quân trên tay bằng giao diện 2D. Có thể chạm quân trong cảnh 3D hoặc dùng các nút lớn bên dưới; hai cách cùng dùng một luật và bước chọn đầu.
- Chuỗi quân trên bàn đọc từ trái sang phải. Kéo ngang bên trong chuỗi để xem các quân cũ; chỉ báo hai đầu luôn hiển thị bên trên. Khi có nước mới, chuỗi cuộn đến đầu vừa nối.
- Bàn phím: Tab để chọn nút, Enter/Space để đánh quân hoặc xác nhận đầu nối. Các phím tạm dừng và chơi lại dùng hệ thống chung của thư viện.
- Tạm dừng hoặc chuyển tab sẽ dừng thời gian suy nghĩ của máy. Chơi lại hủy lượt máy đang đợi và chia ván mới. Đóng trò chơi dọn bộ hẹn giờ và sự kiện.
- **Luật chơi** và **Diễn biến** nằm dưới các quân trên tay; diễn biến giữ 16 nước gần nhất.

## Mã nguồn và kiểm tra

- `games/domino-logic.js`: UMD `ArcadeDomino`, không phụ thuộc DOM. API: `createTiles`, `findOpener`, `createGame({random})`, `handPips`, `legalMoves`, `playTile`, `passTurn`, `applyAction`, `chooseBotAction`, `suggestMove`.
- `games/domino.js`: `ArcadeGames.domino(host, options)`, dùng lifecycle của `ArcadeShared`.
- `games/domino.css`: giao diện có chấm quân bằng CSS, không dùng ảnh bên ngoài.
- Chạy `node --test tests/domino.test.cjs`: kiểm tra bộ quân, mở bàn, xoay quân ở hai đầu, luật bỏ lượt, bàn bị chặn, hòa, kết thúc và 300 ván có hạt giống. Mỗi nước trong mô phỏng đều kiểm tra chuỗi khớp số và bảo toàn đủ 28 quân / 168 chấm.

`createGame()` tạo trạng thái gồm `hands`, `chain`, `current`, `openingId`, `phase`, `passes`, `winner`, `draw`, `score`, `reason`, `turn`, `lastAction`. `phase` là `play` hoặc `finished`. `applyAction(state, player, action)` cập nhật trạng thái tại chỗ và trả `{ok, action}` hoặc `{ok:false, error}`. Nước đi là `{type:'play', tileId:'2-6', end:'left'}` hoặc `{type:'pass'}`. Các nước không hợp lệ không thay đổi trạng thái.

`suggestMove(state, player)` chỉ đọc, trả `{action, explanation}` hoặc `null` nếu ngoài lượt/ván đã kết thúc. Chỉ `applyAction` mới thực hiện nước gợi ý. Kiểm tra UI cả 2D/3D bằng `node tests/domino-pool-harness.cjs browser <nhãn-mới>`; xem [báo cáo đợt cải tiến](domino-pool-verification.md).
