<!-- version v1.0 -->
# Kế hoạch Caro online — hai người khác thiết bị

Phương án được thống nhất ngày 03/10/2026. Bản đầu dùng phòng riêng, tên khách,
mã phòng và link mời. Hai người có thể kết nối từ hai mạng Internet khác nhau khi
máy chủ được triển khai công khai.

## Trải nghiệm người chơi

1. Chọn **Online**, nhập tên rồi **Tạo phòng** hoặc **Vào phòng** bằng mã.
2. Chủ phòng chia sẻ link/mã; người được mời nhập tên và tham gia.
3. Mỗi phòng có hai chỗ X/O. Cả hai bấm **Sẵn sàng** trước khi bắt đầu.
4. Giao diện hiển thị tên, quân, kết nối và lượt. Chỉ người đến lượt được đánh.
5. Kết thúc ván, cả hai đồng ý **Chơi tiếp** để mở ván mới và đổi X/O.
6. Rời phòng khi đang chơi là bỏ cuộc, có xác nhận trước khi thực hiện.

Giữ nguyên luật Caro hiện tại: bàn 15 × 15, từ năm quân liên tiếp thắng. Luật
được dùng chung giữa máy chủ và trình duyệt qua `games/logic.js`.

## Kiến trúc

- Trình duyệt dùng WebSocket có sẵn; máy chủ Node.js dùng thư viện `ws`.
- Máy chủ xác nhận nước đi, lượt, bàn cờ và kết quả; trình duyệt chỉ gửi yêu cầu.
- Endpoint mặc định `/ws/caro` trên cùng host; môi trường HTTPS dùng WSS.
- Có thể cấu hình endpoint riêng bằng meta `caro-websocket-url` và danh sách
  `ONLINE_ORIGINS` trên máy chủ nếu frontend và backend nằm ở hai host.
- `npm start` phục vụ giao diện và WebSocket. `HOST`/`PORT` cấu hình địa chỉ nghe.
- Phiên online tồn tại độc lập với bộ dựng giao diện; đổi 2D/3D không tạo ván mới.

## Đồng bộ và vòng đời

- Mỗi phòng có mã, mã ván `roundId`, phiên bản `version`, hai chỗ ngồi và bàn cờ.
- Yêu cầu nước đi có `requestId`, `roundId`, `version`, chỉ số ô. Máy chủ loại
  yêu cầu trùng, cũ, sai lượt, ô đã có quân hoặc ván đã kết thúc.
- Mỗi chỗ có token ngẫu nhiên riêng, lưu trong `sessionStorage` để tải lại trang.
  Token không nằm trong link mời hay snapshot gửi cho đối thủ.
- Mất kết nối: giữ chỗ 90 giây và ngừng nhận nước mới khi thiếu đối thủ.
- Kết nối lại: nhận toàn bộ snapshot mới nhất; không tự gửi lại nước chưa rõ kết quả.
- Quá hạn: người còn kết nối thắng; nếu cả hai mất kết nối thì ván kết thúc không
  có người thắng. Rời chủ động khi đang chơi tính là bỏ cuộc.
- Nút Chơi lại/phím R ở online là yêu cầu chơi tiếp sau khi ván kết thúc; cần hai
  người đồng ý. Không một người nào được tự xóa bàn cờ của đối thủ.
- Tạm dừng, tab ẩn và mở trợ giúp không dừng máy chủ hay chặn cập nhật mạng.
- Phòng không hoạt động được dọn sau thời hạn; nhịp kiểm tra kết nối và thời gian
  chờ do máy chủ quản lý, không dùng đồng hồ của trình duyệt.

## Giao thức chính

Client gửi JSON `{type, requestId, ...}` với các loại:

| type | Dữ liệu thêm |
| --- | --- |
| create | name |
| join | code, name |
| resume | code, token |
| ready | roundId |
| move | index, roundId, version |
| rematch | roundId |
| leave / sync | — |

Máy chủ trả `ack`, `error`, `session`, `state`, `left`. `state` gồm snapshot
`room` và thông tin chỗ ngồi riêng `you`. Snapshot có trạng thái `waiting`,
`playing`, `finished`, bàn cờ, danh sách người chơi và kết quả.

## Phạm vi bản đầu và triển khai

Phòng lưu trong RAM của **một tiến trình máy chủ**. Khởi động lại hoặc triển khai
lại máy chủ sẽ làm mất các phòng đang chơi; giao diện cần thông báo để người dùng
tạo phòng mới. Chưa có tài khoản, xếp hạng, chat hay ghép đối thủ ngẫu nhiên.

Muốn lưu ván qua bảo trì hoặc chạy nhiều máy chủ cần bổ sung kho trạng thái dùng
chung. Hosting tĩnh đơn thuần không chạy được phần máy chủ online; triển khai
Internet cần dịch vụ chạy Node.js và hỗ trợ WebSocket/HTTPS. Chưa có thông tin
hosting nên trước mắt hoàn thiện mã, kiểm thử và hướng dẫn vận hành cục bộ/LAN.

## Kiểm thử và điều kiện hoàn thành

- Kiểm thử máy chủ: tạo/join/full room, sẵn sàng, lượt, nước đi trùng/cũ, thắng,
  đổi quân sau chơi tiếp, bỏ cuộc, reconnect và hết hạn, không lộ token đối thủ.
- Kiểm thử client: quản lý kết nối, phản hồi lỗi, lưu/khôi phục phiên và bỏ phiên.
- Hai browser context độc lập: đồng bộ bàn, reload, mất/kết nối mạng, phòng đầy,
  chơi tiếp cần đồng thuận, phím tắt và đổi 2D/3D.
- Kiểm tra giao diện ở kích thước điện thoại/iPad và giữ bài test border hiện có.
- Chạy các test luật game hiện tại và kiểm tra cú pháp.
- Thử hai thiết bị thật trên hai mạng khác nhau sau khi backend được triển khai;
  kết quả mô phỏng không thay thế bước xác nhận này.

## Tiến độ ngày 04/10/2026

Đã triển khai máy chủ, client và giao diện phòng; tích hợp ba chế độ Caro và giữ
phiên khi đổi 2D/3D. Đã bổ sung kiểm thử máy chủ/client, kiểm thử hai người bằng
browser context độc lập và chạy lại kiểm thử đường kẻ cùng các game hiện có.

Hướng dẫn chạy, kết quả kiểm thử và giới hạn nằm trong [caro-online.md](caro-online.md).
Bước còn lại cho phát hành Internet là chọn hosting, triển khai backend công khai
và xác nhận trên hai thiết bị thật thuộc hai mạng khác nhau.
