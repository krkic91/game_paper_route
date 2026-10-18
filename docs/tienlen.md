<!-- version v1.0 -->
# Tiến lên miền Nam

Mở thư viện → **Bài** → **Tiến lên miền Nam**, hoặc `#play/tienlen`.
Bạn đấu với ba máy, mỗi người 13 lá. Người hết bài đầu tiên thắng ván.
Đây là biến thể giải trí một ván độc lập, không có tiền cược.

## Điều khiển

Chạm các lá để chọn/bỏ chọn, sau đó bấm **Đánh bài**. **Gợi ý** chọn một bộ hợp lệ
để bạn xem trước; **Bỏ lượt** chỉ có khi đang theo một vòng bài. Có thể đổi cách
sắp xếp bài. Nút và các lá dùng được bằng Tab, Enter hoặc Space. Tạm dừng, chơi lại
và đóng game dùng thanh điều khiển chung; lượt máy được hủy khi đóng/chơi lại.

## Quy ước của bản này

- Mỗi ván chia mới, người giữ **3 bích** mở đầu và phải đánh bộ chứa lá đó.
- Thứ tự số: 3, 4, …, K, A, 2. Cùng số so chất: bích < tép < rô < cơ.
- Có bài lẻ, đôi, bộ ba, tứ quý, sảnh từ ba lá và đôi thông từ ba đôi.
  Sảnh/đôi thông phải liên tiếp và không chứa 2. Sảnh không vòng qua Át.
- Bộ cùng loại phải có cùng số lá; so lá cao nhất rồi chất của lá đó.
- Ba đôi thông chặt một heo. Tứ quý chặt một heo, đôi heo hoặc ba đôi thông.
  Bốn đôi thông chặt một heo, đôi heo, ba đôi thông hoặc tứ quý.
  Bộ cùng loại mạnh hơn có thể chặn nhau. Chuỗi từ năm đôi chỉ so cùng loại,
  cùng độ dài; không thêm quyền chặt đặc biệt.
- Mọi hành động đều theo lượt, kể cả chặt. Đã bỏ thì không trở lại vòng đó.
  Khi ba người còn lại bỏ, người đánh cuối mở vòng mới bằng bất kỳ bộ hợp lệ.
- Không áp dụng tới trắng, thối heo, cóng, thắng theo đội hoặc xếp hạng những
  người còn bài. Ván kết thúc ngay khi một người hết bài; thắng nhận 100 điểm.

Máy chỉ xét bài trên tay mình và bộ đang công khai. Máy không đọc bài đối thủ.
Các quy ước trên được cố định để dễ chơi; các nhóm chơi ngoài đời có thể dùng
quy tắc chặt/bỏ vòng khác.

## Kiểm thử

`node --test tests/tienlen.test.cjs` kiểm tra chia bài, phân loại bộ, chất và
chặt heo, thao tác sai, bỏ vòng, kết thúc, quyền riêng tư của máy. Phép liệt kê
nước đi được so với cách duyệt toàn bộ tập con của tay bài. Có 300 ván dùng hạt
ngẫu nhiên cố định, kiểm tra bảo toàn đủ 52 lá sau mỗi lượt và kết thúc hợp lệ.

Kiểm thử trình duyệt chung: `npm run test:table:browser` (cần máy chủ và Playwright;
cấu hình đường dẫn ở tài liệu kiểm thử chung).
