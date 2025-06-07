import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Link as MuiLink,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { useAuth } from '../../context/AuthContext';

interface RegisterFormData {
  email: string;
  name: string;
  department: string;
  role: string;
  password: string;
  confirmPassword: string;
}

const schema = yup.object({
  email: yup
    .string()
    .required('メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  name: yup
    .string()
    .required('名前は必須です')
    .min(1, '名前を入力してください'),
  department: yup
    .string()
    .required('部署は必須です'),
  role: yup
    .string()
    .required('役職は必須です'),
  password: yup
    .string()
    .required('パスワードは必須です')
    .min(8, 'パスワードは8文字以上で入力してください'),
  confirmPassword: yup
    .string()
    .required('パスワード確認は必須です')
    .oneOf([yup.ref('password')], 'パスワードが一致しません'),
});

const departments = [
  'マーケティング部',
  '営業部',
  '開発部',
  '人事部',
  '経理部',
  '企画部',
  'その他',
];

const roles = [
  'user',
  'manager',
  'admin',
];

const roleLabels = {
  user: '一般ユーザー',
  manager: 'マネージャー',
  admin: '管理者',
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [error, setError] = useState<string>('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      name: '',
      department: '',
      role: 'user',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      await register({
        email: data.email,
        name: data.name,
        department: data.department,
        role: data.role,
        password: data.password,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'アカウント作成に失敗しました。入力内容を確認してください。'
      );
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              LLM Knowledge Hub
            </Typography>
            <Typography component="h2" variant="h5" sx={{ mb: 3 }}>
              アカウント作成
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{ width: '100%' }}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="メールアドレス"
                    autoComplete="email"
                    autoFocus
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />

              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    required
                    fullWidth
                    id="name"
                    label="名前"
                    autoComplete="name"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth margin="normal" error={!!errors.department}>
                    <InputLabel id="department-label">部署</InputLabel>
                    <Select
                      {...field}
                      labelId="department-label"
                      id="department"
                      label="部署"
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.department && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.department.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />

              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth margin="normal" error={!!errors.role}>
                    <InputLabel id="role-label">役職</InputLabel>
                    <Select
                      {...field}
                      labelId="role-label"
                      id="role"
                      label="役職"
                    >
                      {roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {roleLabels[role as keyof typeof roleLabels]}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.role && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.role.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="パスワード"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                  />
                )}
              />

              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="パスワード確認"
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                  />
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    作成中...
                  </>
                ) : (
                  'アカウント作成'
                )}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <MuiLink component={Link} to="/login" variant="body2">
                  既にアカウントをお持ちの方はこちら
                </MuiLink>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;