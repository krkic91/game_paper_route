# Bida bỏ túi

Chế độ luyện tập một người với 15 bi màu và 6 lỗ, có bản 2D và 3D. Đây là chế độ dọn bàn, không áp dụng luật thi đấu 8-ball. Vật lý, điểm và điều kiện thắng giữ nguyên trong đợt cải tiến này.

## Điều khiển

- Di chuột hoặc chạm mặt bàn để chọn hướng từ bi trắng.
- Bấm **Trái/Phải** để chỉnh từng 0,25°. Giữ nút hơn 0,3 giây để xoay liên tục. Mũi tên trái/phải trên bàn phím cũng chỉnh góc; lên/xuống chỉnh lực từng 5%.
- Bấm **Khóa hướng** để giữ góc khi chỉnh lực. Chạm bàn hoặc phím/nút đổi hướng sẽ không đổi góc cho tới khi mở khóa. Bấm **Đánh bi** hoặc Space để đánh. Cú đánh và chơi lại tự mở khóa.
- Đường sáng mô tả đường bi trắng đến vật cản đầu tiên. Vạch vàng là hướng bi mục tiêu sau va chạm dự kiến; nút **Hướng bi: bật/tắt** cho phép ẩn/hiện vạch này.
- Vạch vàng chỉ dài tối đa 140 đơn vị trên bàn, dừng sớm ở bi, băng hoặc lỗ. Nó không dự đoán quãng đường dừng, đường bật băng tiếp theo hay xoáy bi.
- Trong lúc bi lăn, game khóa chỉnh lực, chỉnh hướng và đánh tiếp. Tạm dừng đóng băng mô phỏng; hủy chạm, mất focus hoặc tạm dừng sẽ ngắt thao tác giữ nút.

Bản 3D mở với góc nhìn cao hơn; các nút đổi góc camera có sẵn vẫn hoạt động. Trên màn hình nhỏ, khung bàn gọn hơn và các nút ngắm có vùng bấm tối thiểu 44 px. Tùy chọn hiện hướng bi được giữ khi chơi lại trong cùng phiên.

## Mã nguồn và kiểm tra

- `games/logic.js`: `poolAim(state, angle)` trả đường bi trắng, loại vật cản và đoạn hướng bi mục tiêu; không sửa trạng thái. Hai renderer dùng cùng kết quả.
- `games/action.js`: điều khiển, khóa hướng, hiển thị 2D; `games/3d/action-views.js`: camera và hiển thị 3D. `games/games.css`: bố cục riêng của Bida.
- `tests/pool-aim.test.cjs`: cú thẳng/cắt, bi gần nhất, bi ẩn, băng/lỗ, tiếp xúc tiếp tuyến, dữ liệu không hợp lệ, đối chiếu va chạm với vật lý. Được nạp từ `tests/arcade.test.js`, nên chạy cùng `npm test`.
- `tests/browser-domino-pool.cjs`: tương tác 2D/3D, ba kích thước màn hình, khóa/ngắm/giữ nút/tạm dừng/chơi lại/đóng game. Chạy bằng runner có ngân sách: `node tests/domino-pool-harness.cjs browser <nhãn-mới>`.

Xem [báo cáo xác minh](domino-pool-verification.md) để biết môi trường, kết quả và giới hạn thử nghiệm.
