<!-- version v1.0 -->
# Cờ Thú

Bàn 7 × 9, mỗi bên 8 thú. Có đấu máy ba mức Dễ/Vừa/Khó và hai người cùng thiết bị. Bạn cầm Đỏ khi đấu máy; chọn bên đi trước, gợi ý, xoay bàn và đi lại. Đổi chế độ, độ khó hoặc bên đi trước bắt đầu ván mới.

## Luật được sử dụng

Tham khảo hướng dẫn của nhà cung cấp bộ cờ [Yellow Mountain Imports](https://www.ymimports.com/pages/how-to-play-jungle) và tác giả bộ hướng dẫn [Ancient Chess](https://ancientchess.com/page/play-doushouqi.htm). Cờ Thú có các biến thể; bản này chọn thứ tự **Chuột 1, Mèo 2, Sói 3, Chó 4, Báo 5, Hổ 6, Sư tử 7, Voi 8**, giống hai nguồn trên. Một số bộ khác đảo Chó và Sói.

- Đi một ô ngang hoặc dọc. Ăn quân yếu hơn hoặc bằng sức; không ăn quân mình, không vào hang mình.
- Chuột ăn Voi trên đất. Voi không ăn Chuột, trừ khi Chuột đứng trong bẫy của bên Voi.
- Chỉ Chuột được đi vào sông. Không ăn qua ranh giới sông/đất theo cả hai chiều; hai Chuột trong sông được ăn nhau.
- Hổ và Sư tử nhảy thẳng qua toàn bộ đoạn sông, hạ xuống ô đất đầu tiên; vẫn phải tuân thủ sức mạnh khi ăn quân. Chuột của bất kỳ bên nào trên đường nhảy sẽ chặn nước đó.
- Bẫy chỉ làm yếu thú đối phương. Thú trong bẫy đối phương bị mọi thú phòng thủ ăn; khi rời bẫy lấy lại sức bình thường, kể cả khi nước ra khỏi bẫy là nước ăn quân.
- Vào hang đối phương là thắng. Quy ước bổ sung của bản này: đối phương không còn nước đi thì thua; cùng thế cờ và bên đi xuất hiện ba lần, 100 lượt không ăn quân hoặc 300 lượt tổng thì hòa. Một lượt là một nước đi của một bên, không phải cặp hai nước.

## Điều khiển

Chạm quân rồi chạm ô được đánh dấu. Bàn dùng nút thật, hỗ trợ Tab, phím mũi tên, Enter/Space và nhãn đọc màn hình có tọa độ, tên quân, sức mạnh, loại địa hình. Màu bên được bổ sung bằng nhãn Đỏ/Xanh; chân dung SVG và con số sức mạnh luôn có sẵn, không tải tài nguyên ngoài.

Đi lại ở chế độ hai người hoàn tác một nước. Đấu máy hoàn tác về trước nước gần nhất của bạn, gồm cả nước đáp của máy nếu đã đi. Nếu máy đi đầu và bạn chưa đi, đi lại trả về đầu ván rồi máy đi lại. Tạm dừng dừng đồng hồ chờ máy; khởi động lại/đóng game hủy các tác vụ của ván trước.

## Kỹ thuật và kiểm thử

`games/jungle-logic.js` xuất UMD `ArcadeJungle`; quân số dương là Đỏ (`side=0`), âm là Xanh (`side=1`), trị tuyệt đối là sức mạnh. Ô đánh số theo hàng từ 0 đến 62, hàng trên cùng trước. API: `createGame({first})`, `legalMoves`, `canCapture`, `move`, `undo`, `chooseMove`, `positionKey` và các hàm địa hình.

Máy dùng minimax alpha-beta hữu hạn, đánh giá quân/tiến gần hang/bẫy trên bàn công khai: Dễ sâu 1, Vừa sâu 2, Khó sâu 3; giới hạn số nút tìm kiếm. Gợi ý không tự đi thay người. Không có dịch vụ mạng hay mô hình ngôn ngữ.

Chạy luật: `node --test tests/jungle.test.cjs`. Bộ kiểm thử bao phủ bẫy, chuột/voi, ranh giới nước, nhảy sông bị chặn, chiếm hang, hết nước, hòa, hoàn tác, AI và 200 ván hoàn chỉnh có seed kiểm tra bảo toàn 16 quân.

Chạy UI: `node tests/browser-jungle.cjs` sau khi bật `scripts/serve.js`, cấu hình `TEST_URL`, `PLAYWRIGHT_MODULE`, `PLAYWRIGHT_BROWSERS_PATH` nếu cần. Script dùng Chromium/WebKit với 320×740, 390×844, 820×1180, 1366×900 và lượt chức năng desktop. Đây là mô phỏng viewport/DPR/cảm ứng trên Windows, không phải kiểm thử iPhone/iPad vật lý hoặc máy ảo. Kết quả thực tế được ghi vào `test-results/expansion-jungle/results.json` khi chạy.
