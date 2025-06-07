import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { usePrompts } from '../hooks/usePrompts';

// Mock data for demonstration
const recentActivity = [
  {
    id: '1',
    title: 'マーケティング戦略の策定プロンプト',
    author: '田中太郎',
    category: 'planning',
    createdAt: '2時間前',
    rating: 4.5,
  },
  {
    id: '2',
    title: '顧客対応メールテンプレート',
    author: '佐藤花子',
    category: 'email_writing',
    createdAt: '4時間前',
    rating: 4.8,
  },
  {
    id: '3',
    title: 'データ分析レポート作成',
    author: '山田次郎',
    category: 'analysis',
    createdAt: '6時間前',
    rating: 4.2,
  },
];

const popularPrompts = [
  {
    id: '1',
    title: '効果的な営業メール作成',
    usageCount: 156,
    rating: 4.7,
  },
  {
    id: '2',
    title: 'プレゼン資料構成案',
    usageCount: 134,
    rating: 4.5,
  },
  {
    id: '3',
    title: 'マーケット分析フレームワーク',
    usageCount: 98,
    rating: 4.6,
  },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: promptsData } = usePrompts({ limit: 5 });

  const handleCreatePrompt = () => {
    navigate('/prompts/new');
  };

  const handleViewPrompts = () => {
    navigate('/prompts');
  };

  const handleViewPrompt = (id: string) => {
    navigate(`/prompts/${id}`);
  };

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          おかえりなさい、{user?.name}さん
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {user?.department} | LLM Knowledge Hub
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">今月の利用状況</Typography>
              </Box>
              <Typography variant="h3" color="primary" gutterBottom>
                24
              </Typography>
              <Typography variant="body2" color="text.secondary">
                プロンプト利用回数
              </Typography>
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                ↑ 15% 先月比
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StarIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">作成したプロンプト</Typography>
              </Box>
              <Typography variant="h3" color="secondary" gutterBottom>
                8
              </Typography>
              <Typography variant="body2" color="text.secondary">
                公開中のプロンプト
              </Typography>
              <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                平均評価: 4.3/5
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTimeIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">時間短縮効果</Typography>
              </Box>
              <Typography variant="h3" color="info.main" gutterBottom>
                12.5h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                今月の短縮時間
              </Typography>
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                ROI: 250%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              クイックアクション
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreatePrompt}
              >
                新しいプロンプトを作成
              </Button>
              <Button
                variant="outlined"
                onClick={handleViewPrompts}
              >
                プロンプト一覧を見る
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/search')}
              >
                プロンプトを検索
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              最近の活動
            </Typography>
            <List>
              {recentActivity.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' },
                    borderRadius: 1,
                  }}
                  onClick={() => handleViewPrompt(item.id)}
                >
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={item.category}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.author} • {item.createdAt}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <StarIcon sx={{ fontSize: 16, color: 'orange' }} />
                          <Typography variant="caption">
                            {item.rating}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Popular Prompts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              人気のプロンプト
            </Typography>
            <List>
              {popularPrompts.map((prompt, index) => (
                <ListItem
                  key={prompt.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' },
                    borderRadius: 1,
                  }}
                  onClick={() => handleViewPrompt(prompt.id)}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      fontWeight: 'bold',
                    }}
                  >
                    {index + 1}
                  </Box>
                  <ListItemText
                    primary={prompt.title}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          利用回数: {prompt.usageCount}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <StarIcon sx={{ fontSize: 16, color: 'orange' }} />
                          <Typography variant="caption">
                            {prompt.rating}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Recent Prompts */}
        {promptsData && promptsData.prompts.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  最新のプロンプト
                </Typography>
                <Button
                  variant="text"
                  onClick={handleViewPrompts}
                >
                  すべて見る
                </Button>
              </Box>
              <Grid container spacing={2}>
                {promptsData.prompts.slice(0, 3).map((prompt) => (
                  <Grid item xs={12} md={4} key={prompt.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 4 },
                        transition: 'box-shadow 0.2s',
                      }}
                      onClick={() => handleViewPrompt(prompt.id)}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {prompt.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {prompt.content}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Chip
                            label={prompt.category}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {prompt.user.name}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;