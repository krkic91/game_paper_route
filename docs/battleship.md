<!-- version v1.0 -->
# Hải chiến

Một người đấu máy trên hai vùng biển 10×10. Bản này chơi cục bộ, không yêu cầu tài khoản hoặc máy chủ. Cơ sở luật tham khảo: [hướng dẫn Battleship của Hasbro](https://instructions.hasbro.com/en-au/instruction/battleship). Giao diện và hình minh họa của dự án được tạo bằng HTML, CSS và SVG.

## Luật của bản này

- Mỗi bên có 5 tàu dài 5, 4, 3, 3, 2 ô; tổng cộng 17 ô tàu. Tàu nằm ngang hoặc dọc, được chạm nhau nhưng không chồng lên nhau hoặc vượt khỏi biển.
- Chọn tên tàu rồi chạm ô đầu tàu. Nút Xoay hoặc phím R đổi hướng. Chọn lại tên tàu và ô mới để di chuyển tàu đã đặt; một lần đặt không hợp lệ giữ nguyên vị trí cũ.
- Có thể xếp ngẫu nhiên hoặc dọn toàn bộ để xếp lại. Chỉ xuất trận khi đủ 5 tàu; sau đó đội tàu được cố định.
- Người chơi bắn trước. Hai bên luân phiên một phát mỗi lượt, kể cả khi trúng. Không dùng luật Salvo nhiều phát một lượt.
- Ô đã bắn không thể bắn lại. Bắn đủ các ô của một tàu sẽ công bố tàu bị chìm; đánh chìm đủ cả 5 tàu là thắng.
- Kết thúc ván mở vị trí các tàu còn lại. Điểm thắng là `max(100, 1500 - số phát bắn của bạn × 10)`; thua 0 điểm. Mỗi ván độc lập.

## Độ khó và thông tin bí mật

- **Dễ:** chọn ngẫu nhiên ô chưa bắn.
- **Vừa:** tìm theo các ô xen kẽ; khi trúng thì bắn các ô kề, ưu tiên hướng nối tiếp của hai ô trúng liền nhau.
- **Khó:** đếm các vị trí tàu có thể còn tồn tại theo chiều dài các tàu chưa chìm, loại các vị trí đi qua ô trượt/tàu chìm, ưu tiên vị trí nối tiếp những ô đã trúng. Đây là heuristic mật độ vị trí, không phải giải xác suất toàn bộ mọi cách đặt đội tàu.

AI chỉ nhận `getView(state, player)` đã lọc thông tin và một hàm ngẫu nhiên. `chooseShot` không nhận toàn bộ state và không đọc vị trí đội tàu đối phương. Các ô chưa trúng của tàu máy không xuất hiện trong nhãn, lớp CSS hoặc thuộc tính DOM trước khi kết thúc. Đây là trò chơi cục bộ nên state vẫn có thể được xem bằng công cụ phát triển trình duyệt; không phải cơ chế chống gian lận online.

## Kỹ thuật và kiểm thử

`games/battleship-logic.js` xuất UMD `ArcadeBattleship`: `createGame`, `placeShip`, `clearFleet`, `randomizeFleet`, `start`, `shoot`, `getView`, `chooseShot`. State dùng pha `setup`, `battle`, `finished`; `boards[n].shots` là các phát bắn nhận vào vùng biển của người n. `shoot` trả `hit`, `miss` hoặc `sunk`. `getView` trả bản sao thông tin, không tham chiếu có thể sửa state gốc.

UI đăng ký `ArcadeGames.battleship`, dùng lifecycle chung: tạm dừng đóng băng lượt máy, chơi lại và đóng game hủy timer cũ. Hai vùng biển xếp dọc trên điện thoại, radar mục tiêu lên trước sau khi xuất trận. Ô nhỏ nhất 26×26 px và vùng biển có cuộn ngang riêng khi cần; các nút thao tác chính từ 42 px. Phím mũi tên di chuyển ô, Enter/Space chọn ô.

Chạy kiểm thử luật bằng `node --test tests/battleship.test.cjs`: đặt tàu, di chuyển, chồng lấn/biên, luân phiên, bắn lặp, chìm/thắng, bảo mật view, AI độc lập với vị trí ẩn, và 240 ván hoàn chỉnh có seed.

Kiểm thử trình duyệt: `node tests/browser-battleship.cjs` với `TEST_URL` trỏ tới server dự án. Dùng bộ kit Chromium/WebKit của đợt bổ sung game, gồm thao tác đặt tay, đổi hướng, bàn phím, độ khó, lượt máy, pause, kết quả/chơi lại, đóng game và 4 kích thước 320×740, 390×844, 820×1180, 1366×900. Đây là viewport/DPR/touch mô phỏng trên Windows, không phải máy ảo hoặc iPhone/iPad thật. Đã đạt 10/10 lượt kiểm tra; bằng chứng ở `test-results/expansion-battleship/results.json`, môi trường và phạm vi trong [báo cáo chung](seven-games-testing.md).
