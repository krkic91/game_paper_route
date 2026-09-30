<!-- version v1.0 -->
# Delivery Dash

**Delivery Dash** là game arcade giao báo bằng xe đạp. Người chơi điều khiển xe trên một con đường dọc, giao báo vào các hộp thư, né chướng ngại vật và cố gắng về đích với số điểm cao nhất.

## Mục tiêu

- Điều khiển xe tiến về phía trước trên tuyến đường.
- Giao càng nhiều báo vào hộp thư càng tốt.
- Né các chướng ngại và giữ ít nhất một mạng để tới đích.
- Hiện tại, người chơi hoàn thành màn khi tới cuối đường; số báo đã giao sẽ quyết định điểm và kết quả cuối màn.

## Cấu trúc màn chơi

- Tuyến đường dài khoảng `430` đơn vị.
- Phần đầu là **khu dân cư**, gồm nhà và 24 hộp thư nằm xen kẽ hai bên đường.
- Từ khoảng mốc `305` trở đi là **chặng chướng ngại**.
- Người chơi bắt đầu với:
  - `36` tờ báo
  - `3` mạng
  - `0` điểm

## Điều khiển

### Máy tính

| Phím | Chức năng |
| --- | --- |
| `A` / `D` hoặc `←` / `→` | Lái sang trái hoặc phải |
| `W` / `S` hoặc `↑` / `↓` | Tăng hoặc giảm tốc |
| `Space` | Ném vào hộp thư gần nhất |
| `J` | Ưu tiên ném sang trái |
| `K` | Ưu tiên ném sang phải |
| `R` | Chơi lại |

### Điện thoại

- Kéo trên mặt đường để lái.
- Giữ nút **ĐẠP XE** để tăng tốc.
- Chạm mặt đường để ném báo.
- Chạm màn hình sau khi thắng hoặc thua để chơi lại.

## Cơ chế giao báo

- Khi một hộp thư nằm trong phạm vi ném, nó sẽ có vòng vàng và nhãn **MỤC TIÊU**.
- Đường chấm vàng thể hiện quỹ đạo bay của tờ báo.
- Mỗi lần giao thành công được `100 điểm`.
- Ném khi không có mục tiêu hợp lệ hoặc để tờ báo va vào chướng ngại sẽ bị tính là ném trượt.
- Một hộp thư đang có báo bay tới sẽ không bị khóa mục tiêu lần thứ hai.

## Chướng ngại vật

Game có các loại chướng ngại:

- Thùng rác
- Ổ gà
- Chó chạy ngang
- Cọc tiêu
- Rào chắn

Khi va chạm, người chơi sẽ:

- Mất một mạng.
- Bị giảm tốc độ.
- Nhận một khoảng bảo vệ ngắn để không mất nhiều mạng liên tục.
- Thua nếu mất cả 3 mạng trước khi tới đích.

Chướng ngại sẽ biến mất ngay sau khi người chơi vượt qua vị trí của nó.

## Giao diện

HUD trong game hiển thị:

- Số hộp thư đã giao trên tổng số 24.
- Điểm hiện tại.
- Số báo còn lại.
- Số mạng còn lại.
- Tiến độ tới đích.
- Thông báo giao thành công, ném trượt hoặc va chạm.
- Bảng hướng dẫn đầu màn tự ẩn sau 3 giây hoặc biến mất ngay khi người chơi thực hiện thao tác.

## Vòng lặp gameplay

> **Lái xe → quan sát hộp thư mục tiêu → ném báo đúng lúc → né vật cản → về đích với điểm cao nhất.**

## Chạy game

Game không cần bước build. Mở `index.html` để vào **Trạm Chơi** rồi chọn **Delivery Dash**, hoặc mở `delivery.html` để chơi riêng game gốc. Có thể chạy một web server cục bộ từ thư mục gốc dự án, ví dụ:

```bash
python -m http.server 4173
```

Sau đó truy cập:

```text
http://localhost:4173
```

## Kiểm thử

Chạy bộ kiểm thử logic bằng lệnh:

```bash
npm test
```
